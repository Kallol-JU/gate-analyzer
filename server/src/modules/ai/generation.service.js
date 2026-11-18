import { env } from '../../config/env.js';
import { GenerationBatch } from '../../models/GenerationBatch.js';
import { ADMIN_SELECT, Question } from '../../models/Question.js';
import { Subject } from '../../models/Subject.js';
import { Topic } from '../../models/Topic.js';
import { ApiError } from '../../utils/ApiError.js';
import { getLatexChecker, loadDuplicateCandidates } from '../content/content.service.js';
import {
  buildGenerationPrompt, buildVerificationPrompt, compareSolverAnswer, GENERATION_SCHEMA, normalizeGenerated, parseJsonText, PROMPT_VERSION, VERIFICATION_SCHEMA,
} from '../content/generatedQuestion.js';
import { evaluateQuestionQuality } from '../content/questionQuality.js';
import { AiError, getAiClient } from './geminiClient.js';

const STALE_AFTER_MS = 15 * 60 * 1000;
const MAX_CONCURRENT_BATCHES = 2;

export function aiStatus() {
  const client = getAiClient();
  return {
    configured: Boolean(client),
    model: client?.model ?? env.GEMINI_MODEL,
    verifyEnabled: env.AI_VERIFY_ENABLED,
    limits: { maxQuestionsPerRequest: env.AI_MAX_BATCH_QUESTIONS, questionsPerModelCall: env.AI_CHUNK_SIZE, dailyQuestionsPerAdmin: env.AI_DAILY_QUESTION_LIMIT, maxOutputTokens: env.AI_MAX_OUTPUT_TOKENS, maxRetries: env.AI_MAX_RETRIES },
  };
}

const startOfUtcDay = () => new Date(new Date().toISOString().slice(0, 10));

export async function usedToday(adminId) {
  const rows = await GenerationBatch.aggregate([{ $match: { createdBy: adminId, createdAt: { $gte: startOfUtcDay() } } }, { $group: { _id: null, n: { $sum: '$requested' } } }]);
  return rows[0]?.n ?? 0;
}

/** Validates the request, records a batch and starts generating in the background. Returns the batch immediately. */
export async function startGeneration(admin, p) {
  if (!getAiClient()) throw new ApiError(503, 'AI_NOT_CONFIGURED', 'AI generation is not configured. Set GEMINI_API_KEY in server/.env and restart the server.');

  const total = p.counts.MCQ + p.counts.MSQ + p.counts.NAT;
  if (total < 1) throw new ApiError(400, 'VALIDATION_ERROR', 'Request at least one question.', [{ path: 'counts', message: 'Choose how many questions of each type.' }]);
  if (total > env.AI_MAX_BATCH_QUESTIONS) throw new ApiError(400, 'BATCH_TOO_LARGE', `At most ${env.AI_MAX_BATCH_QUESTIONS} questions per request (AI_MAX_BATCH_QUESTIONS).`);

  const [subject, topic] = await Promise.all([Subject.findById(p.subjectId), Topic.findOne({ _id: p.topicId, subjectId: p.subjectId })]);
  if (!subject) throw new ApiError(400, 'SUBJECT_NOT_FOUND', 'Subject does not exist.');
  if (!topic) throw new ApiError(400, 'TAXONOMY_MISMATCH', 'The topic does not exist or does not belong to the subject.');

  let reference;
  if (p.referenceQuestionId) {
    if (p.style !== 'PYQ_INSPIRED') throw new ApiError(400, 'REFERENCE_NOT_ALLOWED', 'A reference PYQ can only be used for the PYQ-inspired style.');
    reference = await Question.findById(p.referenceQuestionId).select(ADMIN_SELECT);
    if (!reference || reference.source !== 'PYQ' || reference.verificationStatus !== 'verified') {
      throw new ApiError(400, 'REFERENCE_INVALID', 'The reference must be an existing, verified PYQ in the question bank.');
    }
  }

  if ((await usedToday(admin._id)) + total > env.AI_DAILY_QUESTION_LIMIT) {
    throw new ApiError(429, 'AI_DAILY_LIMIT', `Daily generation limit reached (${env.AI_DAILY_QUESTION_LIMIT} questions per admin per day).`);
  }
  if ((await GenerationBatch.countDocuments({ status: 'running', startedAt: { $gt: new Date(Date.now() - STALE_AFTER_MS) } })) >= MAX_CONCURRENT_BATCHES) {
    throw new ApiError(429, 'AI_BUSY', 'Two generation jobs are already running. Wait for one to finish.');
  }

  const batch = await GenerationBatch.create({
    createdBy: admin._id,
    params: { ...p, subjectName: subject.name, topicName: topic.name },
    model: getAiClient().model,
    promptVersion: PROMPT_VERSION,
    requested: total,
  });
  // Fire and forget: the admin polls the batch for progress. Errors are recorded on the batch, never thrown here.
  setImmediate(() => runBatch(batch._id, { subject, topic, reference }).catch(async (err) => {
    await GenerationBatch.findByIdAndUpdate(batch._id, { status: 'failed', error: String(err.message).slice(0, 300), finishedAt: new Date() }).catch(() => {});
  }));
  return batch;
}

/** Marks batches that stopped reporting (for example the server restarted mid-run) as failed. */
export async function expireStaleBatches() {
  await GenerationBatch.updateMany(
    { status: 'running', startedAt: { $lt: new Date(Date.now() - STALE_AFTER_MS) } },
    { status: 'failed', error: 'The job did not finish (the server may have restarted).', finishedAt: new Date() },
  );
}

function chunksOf(counts) {
  const chunks = [];
  for (const type of ['MCQ', 'MSQ', 'NAT']) {
    for (let left = counts[type]; left > 0; left -= env.AI_CHUNK_SIZE) chunks.push({ type, n: Math.min(left, env.AI_CHUNK_SIZE) });
  }
  return chunks;
}

export async function runBatch(batchId, { subject, topic, reference }) {
  const client = getAiClient();
  const batch = await GenerationBatch.findById(batchId);
  const p = batch.params;
  const latexCheck = await getLatexChecker();
  const existing = await loadDuplicateCandidates(subject._id);
  const recent = await Question.find({ topicId: topic._id }).sort({ createdAt: -1 }).limit(15).select('statement').lean();
  const avoid = recent.map((r) => r.statement);
  let failedCalls = 0;

  for (const chunk of chunksOf(p.counts)) {
    const inc = { 'usage.calls': 0, 'usage.promptTokens': 0, 'usage.outputTokens': 0, saved: 0, flagged: 0, rejectedCount: 0 };
    const rejected = [];
    const savedIds = [];
    try {
      const prompt = buildGenerationPrompt({
        subject: subject.name, topic: topic.name, counts: { [chunk.type]: chunk.n }, difficulty: p.difficulty, style: p.style, concepts: p.concepts, avoid,
        reference: reference && { statement: reference.statement, code: reference.code, options: reference.options },
      });
      const out = await client.generateJson({ ...prompt, schema: GENERATION_SCHEMA, maxOutputTokens: env.AI_MAX_OUTPUT_TOKENS });
      inc['usage.calls'] += 1;
      inc['usage.promptTokens'] += out.usage.promptTokens;
      inc['usage.outputTokens'] += out.usage.outputTokens;

      const parsed = parseJsonText(out.text);
      if (!parsed.ok || !Array.isArray(parsed.value?.questions)) {
        failedCalls += 1;
        rejected.push({ reason: 'invalid_json', detail: parsed.error ?? 'The response had no "questions" list.' });
      } else {
        // 1. Shape and rules, 2. quality and duplicates (against the bank and this batch).
        const candidates = [];
        for (const raw of parsed.value.questions.slice(0, chunk.n)) {
          const norm = normalizeGenerated(raw, {
            style: p.style, difficulty: p.difficulty, subjectId: subject._id, topicId: topic._id, model: client.model, batchId, inspiredByQuestionId: reference?._id,
            inspirationNote: reference ? 'Modelled on the concept pattern of the referenced PYQ; values, wording and solution are original.' : undefined,
          });
          if (!norm.ok) {
            rejected.push({ reason: 'invalid', detail: norm.errors.join('; ').slice(0, 300), snippet: String(raw?.statement ?? '').slice(0, 120) });
            continue;
          }
          const quality = evaluateQuestionQuality(norm.question, { existing, latexCheck });
          if (quality.blocking) {
            rejected.push({ reason: quality.errors.some((e) => e.code.startsWith('DUPLICATE_') && e.code !== 'DUPLICATE_OPTIONS') ? 'duplicate' : 'quality', detail: quality.errors.map((e) => e.message).join('; ').slice(0, 300), snippet: norm.question.statement.slice(0, 120) });
            continue;
          }
          candidates.push({ q: norm.question, quality });
          existing.push({ id: `batch-${candidates.length}-${Date.now()}`, statement: norm.question.statement, code: norm.question.code, options: norm.question.options });
        }

        // 3. Independent answer check: a separate call that never sees the answer key.
        let solver = new Map();
        let verifyError;
        if (env.AI_VERIFY_ENABLED && candidates.length) {
          try {
            const vOut = await client.generateJson({ ...buildVerificationPrompt(candidates.map((c) => c.q)), schema: VERIFICATION_SCHEMA, maxOutputTokens: env.AI_MAX_OUTPUT_TOKENS, temperature: 0.1 });
            inc['usage.calls'] += 1;
            inc['usage.promptTokens'] += vOut.usage.promptTokens;
            inc['usage.outputTokens'] += vOut.usage.outputTokens;
            const v = parseJsonText(vOut.text);
            if (v.ok && Array.isArray(v.value?.results)) solver = new Map(v.value.results.map((r) => [r.index, r]));
            else verifyError = 'The solver returned an unreadable response.';
          } catch (err) {
            verifyError = err instanceof AiError ? err.message : 'The solver call failed.';
          }
        }

        // 4. Save as drafts. Never published, never marked verified.
        for (const [i, c] of candidates.entries()) {
          const result = solver.get(i);
          const ai = !env.AI_VERIFY_ENABLED
            ? { checked: false, note: 'Independent verification is disabled.' }
            : result ? { checked: true, model: client.model, ...compareSolverAnswer(c.q, result) } : { checked: false, note: verifyError ?? 'The solver did not answer this question.' };
          const disagreed = ai.checked && !ai.agrees;
          const doc = new Question({
            ...c.q,
            createdBy: batch.createdBy,
            verificationStatus: disagreed ? 'draft' : 'pending_review', // a flagged question stands out and needs explicit acknowledgement
            validation: { checkedAt: new Date(), errors: c.quality.errors, warnings: c.quality.warnings, duplicates: c.quality.duplicates, aiVerification: ai },
          });
          await doc.save();
          savedIds.push(doc._id);
          inc.saved += 1;
          if (disagreed) inc.flagged += 1;
          avoid.push(doc.statement);
        }
      }
    } catch (err) {
      failedCalls += 1;
      rejected.push({ reason: 'ai_error', detail: err instanceof AiError ? err.message : 'Unexpected error during generation.' });
    }
    inc.rejectedCount += rejected.length;
    await GenerationBatch.findByIdAndUpdate(batchId, {
      $inc: inc,
      ...(savedIds.length && { $push: { questionIds: { $each: savedIds }, rejected: { $each: rejected } } }),
      ...(!savedIds.length && rejected.length && { $push: { rejected: { $each: rejected } } }),
    });
  }

  const done = await GenerationBatch.findById(batchId);
  done.status = done.saved === 0 ? 'failed' : failedCalls > 0 ? 'partial' : 'completed';
  if (done.saved === 0 && !done.error) done.error = done.rejected[0]?.detail ?? 'No question passed validation.';
  done.finishedAt = new Date();
  await done.save();
  return done;
}

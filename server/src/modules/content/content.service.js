import { ADMIN_FULL_SELECT, Question } from '../../models/Question.js';
import { Subject } from '../../models/Subject.js';
import { Topic } from '../../models/Topic.js';
import { ApiError } from '../../utils/ApiError.js';
import { slugify } from '../../utils/http.js';
import { REVIEWED_SOURCES } from '../questions/questionRules.js';
import { evaluateQuestionQuality } from './questionQuality.js';

// ---------------- quality runner ----------------
let latexChecker; // undefined = not tried yet, null = KaTeX unavailable
/** Uses the real KaTeX renderer when the package is installed; otherwise only structural LaTeX checks run. */
export async function getLatexChecker() {
  if (latexChecker === undefined) {
    try {
      const katex = (await import('katex')).default;
      latexChecker = (span) => {
        try {
          katex.renderToString(span, { throwOnError: true, strict: 'ignore' });
          return null;
        } catch (err) {
          return String(err.message).replace(/^KaTeX parse error:\s*/, '').slice(0, 140);
        }
      };
    } catch {
      latexChecker = null;
    }
  }
  return latexChecker ?? undefined;
}

/** Plain question input for the quality engine. `overrides` lets us ask "would this pass if verified/published?". */
export function toQualityInput(doc, overrides = {}) {
  const o = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    type: o.type,
    statement: o.statement,
    code: o.code,
    options: (o.options ?? []).map((x) => ({ key: x.key, text: x.text })),
    correctOptions: o.correctOptions ?? [],
    natAnswer: o.natAnswer ? { min: o.natAnswer.min, max: o.natAnswer.max } : undefined,
    explanation: o.explanation,
    solutionSteps: o.solutionSteps ?? [],
    optionAnalysis: o.optionAnalysis ?? [],
    marks: o.marks,
    negativeMarks: o.negativeMarks,
    difficulty: o.difficulty,
    estimatedTimeSeconds: o.estimatedTimeSeconds,
    source: o.source,
    pyq: o.pyq ? { year: o.pyq.year, session: o.pyq.session } : undefined,
    sourceReference: o.sourceReference,
    inspiredByQuestionId: o.inspiredByQuestionId,
    status: o.status,
    verificationStatus: o.verificationStatus,
    ...overrides,
  };
}

/** Questions in the same subject to compare against (legacy ones without a stored hash are hashed on the fly). */
export async function loadDuplicateCandidates(subjectId, excludeId) {
  const docs = await Question.find({ subjectId, ...(excludeId && { _id: { $ne: excludeId } }) })
    .select('statement code options contentHash')
    .limit(3000)
    .lean();
  return docs.map((d) => ({ id: String(d._id), statement: d.statement, code: d.code, options: d.options, contentHash: d.contentHash }));
}

export async function runQuality(doc, overrides, extraExisting = []) {
  const existing = [...(await loadDuplicateCandidates(doc.subjectId, doc._id)), ...extraExisting];
  return evaluateQuestionQuality(toQualityInput(doc, overrides), { existing, latexCheck: await getLatexChecker() });
}

const report = (result, aiVerification) => ({
  checkedAt: new Date(),
  errors: result.errors,
  warnings: result.warnings,
  duplicates: result.duplicates,
  ...(aiVerification && { aiVerification }),
});

const asDetails = (errors) => errors.map((e) => ({ path: e.path ?? e.code, message: e.message }));

async function loadFull(id) {
  const q = await Question.findById(id).select(ADMIN_FULL_SELECT);
  if (!q) throw new ApiError(404, 'QUESTION_NOT_FOUND', 'Question not found.');
  return q;
}

// ---------------- review workflow ----------------
export async function revalidateQuestion(id) {
  const q = await loadFull(id);
  const result = await runQuality(q);
  q.validation = report(result, q.validation?.aiVerification);
  await q.save();
  return { question: q, result };
}

/** A person confirms the content is correct. Blocks on any automated error. */
export async function verifyQuestion(adminId, id, { notes, acknowledgeAiDisagreement } = {}) {
  const q = await loadFull(id);
  // Run the checks as if it were already verified, so the PYQ source-reference rules apply now.
  const result = await runQuality(q, { verificationStatus: 'verified' });
  if (result.blocking) throw new ApiError(409, 'QUALITY_FAILED', 'Fix the listed problems before verifying.', asDetails(result.errors));
  const ai = q.validation?.aiVerification;
  if (ai?.checked && ai.agrees === false && !acknowledgeAiDisagreement) {
    throw new ApiError(409, 'AI_DISAGREEMENT', 'The independent solver disagreed with the answer key or found the question ambiguous. Review it and confirm explicitly to verify.', [
      { path: 'aiVerification', message: `Solver answered "${ai.solverAnswer}"${ai.ambiguous ? ' and flagged ambiguity' : ''}.` },
    ]);
  }
  q.verificationStatus = 'verified';
  q.review = { verifiedBy: adminId, verifiedAt: new Date(), notes: notes || undefined };
  q.validation = report(result, ai);
  await q.save();
  return q;
}

export async function publishQuestion(id) {
  const q = await loadFull(id);
  if (REVIEWED_SOURCES.includes(q.source) && q.verificationStatus !== 'verified') {
    throw new ApiError(409, 'NOT_VERIFIED', 'Only verified questions can be published. Verify it first.');
  }
  const result = await runQuality(q, { status: 'published' });
  if (result.blocking) throw new ApiError(409, 'QUALITY_FAILED', 'Fix the listed problems before publishing.', asDetails(result.errors));
  q.status = 'published';
  q.validation = report(result, q.validation?.aiVerification);
  await q.save();
  return q;
}

export async function unpublishQuestion(id) {
  const q = await loadFull(id);
  q.status = 'draft';
  await q.save();
  return q;
}

export async function rejectQuestion(adminId, id, reason) {
  const q = await loadFull(id);
  q.verificationStatus = 'rejected';
  q.status = 'draft';
  q.review = { verifiedBy: adminId, verifiedAt: new Date(), rejectedReason: reason };
  await q.save();
  return q;
}

const ACTIONS = {
  verify: (adminId, id, o) => verifyQuestion(adminId, id, o),
  publish: (_a, id) => publishQuestion(id),
  unpublish: (_a, id) => unpublishQuestion(id),
  reject: (adminId, id, o) => rejectQuestion(adminId, id, o.reason),
  revalidate: (_a, id) => revalidateQuestion(id),
};

/** Runs one action over many questions. One failure never stops the rest; each result is reported. */
export async function bulkAction(adminId, action, ids, options = {}) {
  const results = [];
  for (const id of ids) {
    try {
      await ACTIONS[action](adminId, id, options);
      results.push({ id, ok: true });
    } catch (err) {
      results.push({ id, ok: false, code: err.code ?? 'ERROR', error: err.message, details: err.details });
    }
  }
  return results;
}

// ---------------- editing policy ----------------
// Changing any of these on a verified question invalidates the human review.
const MATERIAL = ['type', 'statement', 'code', 'options', 'correctOptions', 'natAnswer', 'marks', 'explanation', 'solutionSteps', 'optionAnalysis'];
export const materialSnapshot = (doc) => JSON.stringify(MATERIAL.map((k) => (typeof doc.get === 'function' ? doc.get(k) : doc[k]) ?? null));

/** Call after applying an edit. Returns true if the question dropped back to review. */
export function applyEditPolicy(doc, snapshotBefore) {
  if (!REVIEWED_SOURCES.includes(doc.source) || doc.verificationStatus !== 'verified') return false;
  if (materialSnapshot(doc) === snapshotBefore) return false;
  doc.verificationStatus = 'pending_review';
  doc.status = 'draft';
  doc.review = undefined;
  return true;
}

// ---------------- JSON import ----------------
/**
 * Validates (and, unless dryRun, saves) a batch of questions. Imported questions are ALWAYS saved as drafts:
 * nothing becomes visible to students without verification and publishing. Exact or near duplicates are
 * skipped, so re-importing the same file creates nothing new.
 */
export async function importQuestions(adminId, { items, dryRun }) {
  const subjects = new Map();
  const topics = new Map();
  const findSubject = async (name) => {
    if (!subjects.has(name)) subjects.set(name, await Subject.findOne({ $or: [{ slug: slugify(name) }, { name }] }));
    return subjects.get(name);
  };
  const findTopic = async (subject, name) => {
    const key = `${subject._id}|${name}`;
    if (!topics.has(key)) topics.set(key, await Topic.findOne({ subjectId: subject._id, $or: [{ slug: slugify(name) }, { name }] }));
    return topics.get(key);
  };

  const accepted = []; // earlier items of this same file, so duplicates inside the file are caught too
  const results = [];
  for (const [index, item] of items.entries()) {
    const { subject: subjectName, topic: topicName, ...fields } = item;
    const fail = (status, errors, warnings = []) => results.push({ index, status, errors, warnings });

    const subject = await findSubject(subjectName);
    const topic = subject && (await findTopic(subject, topicName));
    if (!subject || !topic) {
      fail('invalid', [{ code: 'TAXONOMY', message: !subject ? `Unknown subject "${subjectName}".` : `Unknown topic "${topicName}" in "${subjectName}".` }]);
      continue;
    }

    const reviewed = REVIEWED_SOURCES.includes(fields.source);
    const doc = new Question({
      ...fields,
      subjectId: subject._id,
      topicId: topic._id,
      status: 'draft', // never published by import
      verificationStatus: fields.verificationStatus ?? (fields.source === 'PYQ' ? 'draft' : reviewed ? 'pending_review' : undefined),
      createdBy: adminId,
    });
    try {
      await doc.validate();
    } catch (err) {
      fail('invalid', Object.values(err.errors ?? {}).map((e) => ({ code: 'RULE', message: e.message, path: e.path })));
      continue;
    }

    const result = await runQuality(doc, undefined, accepted);
    const duplicate = result.errors.some((e) => e.code.startsWith('DUPLICATE_') && e.code !== 'DUPLICATE_OPTIONS');
    const warnings = [...result.warnings];
    if (fields.source === 'PYQ' && !fields.sourceReference?.paperUrl) {
      warnings.push({ code: 'PYQ_NO_SOURCE', message: 'No official source recorded. It stays a draft and cannot be verified until you add the paper URL and answer-key reference.' });
    }
    if (result.blocking) {
      fail(duplicate ? 'duplicate' : 'invalid', result.errors, warnings);
      continue;
    }
    let id;
    if (!dryRun) {
      doc.validation = report(result);
      await doc.save();
      id = String(doc._id);
    }
    accepted.push({ id: id ?? `import-${index}`, statement: doc.statement, code: doc.code, options: doc.options });
    results.push({ index, status: 'ok', errors: [], warnings, id });
  }

  const count = (s) => results.filter((r) => r.status === s).length;
  return { dryRun, summary: { total: items.length, ok: count('ok'), invalid: count('invalid'), duplicate: count('duplicate'), created: dryRun ? 0 : count('ok') }, results };
}

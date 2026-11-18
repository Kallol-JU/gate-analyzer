// Pure functions: the contract with the AI model. Prompts, the response schema, parsing and normalising
// model output into Question fields, and comparing an independent solver's answer with the key.
// No network and no database here, so all of it is unit-tested.
import { defaultNegativeMarks, DIFFICULTIES, OPTION_KEYS, QUESTION_TYPES, validateQuestionRules } from '../questions/questionRules.js';

export const PROMPT_VERSION = 'gen-v1';
const S = (extra = {}) => ({ type: 'STRING', ...extra });
const ARR = (items) => ({ type: 'ARRAY', items });

/** Gemini `responseSchema` (OpenAPI subset). The model is forced to return this JSON shape. */
export const GENERATION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    questions: ARR({
      type: 'OBJECT',
      properties: {
        type: S({ enum: QUESTION_TYPES }),
        statement: S(),
        code: S(),
        options: ARR({ type: 'OBJECT', properties: { key: S({ enum: OPTION_KEYS }), text: S() }, required: ['key', 'text'] }),
        correctOptions: ARR(S({ enum: OPTION_KEYS })),
        natMin: { type: 'NUMBER' },
        natMax: { type: 'NUMBER' },
        marks: { type: 'INTEGER' },
        difficulty: S({ enum: DIFFICULTIES }),
        conceptTags: ARR(S()),
        estimatedTimeSeconds: { type: 'INTEGER' },
        learningObjective: S(),
        solutionSteps: ARR(S()),
        explanation: S(),
        optionAnalysis: ARR({ type: 'OBJECT', properties: { key: S({ enum: OPTION_KEYS }), analysis: S() }, required: ['key', 'analysis'] }),
        commonMistakes: ARR(S()),
        relatedConcepts: ARR(S()),
      },
      required: ['type', 'statement', 'marks', 'difficulty', 'explanation', 'solutionSteps', 'conceptTags'],
    }),
  },
  required: ['questions'],
};

export const VERIFICATION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    results: ARR({
      type: 'OBJECT',
      properties: { index: { type: 'INTEGER' }, answer: S(), reasoning: S(), ambiguous: { type: 'BOOLEAN' }, ambiguityNote: S() },
      required: ['index', 'answer', 'ambiguous'],
    }),
  },
  required: ['results'],
};

const STYLE_TEXT = {
  PYQ_INSPIRED:
    'Write PYQ-INSPIRED questions: original questions that test the same concept and reasoning pattern as a typical GATE CSE previous-year question, but with different values, constraints, representation or an added condition. Never reproduce, paraphrase closely or reconstruct any actual GATE question. Wording, numbers and the solution must be your own.',
  ADVANCED:
    'Write ADVANCED ORIGINAL questions that need deeper analytical thinking: multi-step calculation, algorithm tracing, complexity analysis, code-output prediction, edge cases, conceptual traps or the combination of two concepts. Avoid trivial recall.',
};

/** Builds the generation prompt. `reference` (optional) is the admin's own stored PYQ, used only as a concept pattern. */
export function buildGenerationPrompt({ subject, topic, counts, difficulty, style, concepts = [], reference, avoid = [] }) {
  const wanted = Object.entries(counts).filter(([, n]) => n > 0).map(([t, n]) => `${n} ${t}`).join(', ');
  const system = [
    'You are a senior GATE Computer Science and Information Technology paper setter and an expert in the official GATE syllabus.',
    'You write precise, unambiguous, self-contained questions with exactly one defensible answer key. Never invent facts or ask about undefined notation.',
    'Return ONLY JSON that matches the response schema.',
  ].join(' ');

  const rules = [
    `Subject: ${subject}. Topic: ${topic}. Difficulty: ${difficulty}. Produce exactly: ${wanted}.`,
    STYLE_TEXT[style],
    concepts.length ? `Focus on these concepts: ${concepts.join('; ')}.` : null,
    'Formatting: use KaTeX with $...$ for inline maths and $$...$$ for display maths. Put code in the "code" field, not the statement. Do not use markdown.',
    'MCQ: exactly 4 options (A-D), exactly one correct option. MSQ: exactly 4 options (A-D), two or more correct options; the answer is the exact set. NAT: no options; give natMin and natMax (the accepted range; use equal values for an exact integer, a narrow range for decimals) and ask for a number, ending the statement with "______".',
    'marks must be 1 or 2. Difficulty must match the reasoning needed; "hard" and "very_hard" need several non-obvious steps.',
    'For every question also give: conceptTags (2-5), estimatedTimeSeconds (realistic exam time), learningObjective (one sentence), solutionSteps (clear numbered-style steps, each one string), explanation (the final answer with the key reasoning, and it must agree with the key), optionAnalysis (why each option is right or wrong, MCQ/MSQ only), commonMistakes (the traps), relatedConcepts.',
    'Every value you compute must be correct. Re-check the arithmetic and the logic before answering. Do not use real GATE question text.',
    avoid.length ? `Do not repeat these existing questions or their ideas:\n${avoid.slice(0, 15).map((s, i) => `${i + 1}. ${s.slice(0, 160)}`).join('\n')}` : null,
  ].filter(Boolean);

  if (reference) {
    rules.push(
      `Concept pattern to build on (an existing question from the question bank; do NOT copy it, change its values, constraints or representation):\n${reference.statement}${reference.code ? `\n${reference.code}` : ''}${reference.options?.length ? `\nOptions: ${reference.options.map((o) => `${o.key}) ${o.text}`).join(' | ')}` : ''}`,
    );
  }
  return { system, user: rules.join('\n\n') };
}

/** Independent solver prompt: sees the question but NOT the claimed answer, so it cannot simply agree. */
export function buildVerificationPrompt(questions) {
  const system =
    'You are an independent GATE Computer Science solver. Solve every question from scratch, step by step, before answering. You are not given any answer key. ' +
    'Answer format: MCQ -> a single option letter; MSQ -> all correct letters separated by commas (for example "A,C"); NAT -> the number only. ' +
    'Set ambiguous=true if the question is unclear, underspecified, self-contradictory or has more than one defensible answer, and say why. Return ONLY JSON matching the schema.';
  const user = questions
    .map((q, index) => {
      const opts = q.options?.length ? `\nOptions:\n${q.options.map((o) => `${o.key}) ${o.text}`).join('\n')}` : '';
      return `Question ${index} [${q.type}, ${q.marks} mark(s)]:\n${q.statement}${q.code ? `\n${q.code}` : ''}${opts}`;
    })
    .join('\n\n---\n\n');
  return { system, user };
}

/** Accepts plain JSON or JSON wrapped in markdown fences. Returns { ok, value, error }. */
export function parseJsonText(text) {
  const cleaned = String(text ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return { ok: true, value: JSON.parse(cleaned) };
  } catch (err) {
    return { ok: false, error: `The model did not return valid JSON (${err.message}).` };
  }
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
const strList = (v, maxItems, maxLen) => (Array.isArray(v) ? v.map((x) => str(x, maxLen)).filter(Boolean).slice(0, maxItems) : []);
const normDifficulty = (v) => {
  const d = String(v ?? '').toLowerCase().replace(/[\s-]+/g, '_');
  return DIFFICULTIES.includes(d) ? d : undefined;
};

/**
 * Validates and converts one raw model question into Question fields (status draft, verification draft).
 * Returns { ok, question, errors } and never throws on bad model output.
 */
export function normalizeGenerated(raw, { style, difficulty, subjectId, topicId, model, batchId, inspiredByQuestionId, inspirationNote }) {
  const errors = [];
  if (!raw || typeof raw !== 'object') return { ok: false, errors: ['Not an object.'] };

  const type = String(raw.type ?? '').toUpperCase();
  const q = {
    type,
    statement: str(raw.statement, 5000),
    code: str(raw.code, 5000) || undefined,
    options: [],
    correctOptions: [],
    natAnswer: undefined,
    marks: Number(raw.marks),
    difficulty: normDifficulty(raw.difficulty) ?? difficulty,
    explanation: str(raw.explanation, 5000),
    solutionSteps: strList(raw.solutionSteps, 12, 600),
    commonMistakes: strList(raw.commonMistakes, 6, 400),
    relatedConcepts: strList(raw.relatedConcepts, 8, 80),
    conceptTags: strList(raw.conceptTags, 8, 60),
    learningObjective: str(raw.learningObjective, 500),
    estimatedTimeSeconds: Number.isFinite(raw.estimatedTimeSeconds) ? Math.min(1800, Math.max(10, Math.round(raw.estimatedTimeSeconds))) : undefined,
    subjectId,
    topicId,
    source: style === 'PYQ_INSPIRED' ? 'PYQ_INSPIRED' : 'ADVANCED',
    status: 'draft',
    verificationStatus: 'draft',
    visibility: 'public',
    inspiredByQuestionId,
    inspirationNote,
    aiMeta: { model, generatedAt: new Date(), batchId, promptVersion: PROMPT_VERSION, style },
  };

  if (!QUESTION_TYPES.includes(type)) errors.push(`Unknown question type "${raw.type}".`);
  if (!q.statement) errors.push('Missing statement.');
  if (![1, 2].includes(q.marks)) errors.push('Marks must be 1 or 2.');

  if (type === 'NAT') {
    if (Number.isFinite(raw.natMin) && Number.isFinite(raw.natMax)) q.natAnswer = { min: raw.natMin, max: raw.natMax };
  } else {
    q.options = (Array.isArray(raw.options) ? raw.options : [])
      .map((o) => ({ key: String(o?.key ?? '').toUpperCase(), text: str(o?.text, 1000) }))
      .filter((o) => o.text)
      .sort((a, b) => a.key.localeCompare(b.key));
    q.correctOptions = (Array.isArray(raw.correctOptions) ? raw.correctOptions : []).map((k) => String(k).toUpperCase());
    const analysis = (Array.isArray(raw.optionAnalysis) ? raw.optionAnalysis : [])
      .map((a) => ({ key: String(a?.key ?? '').toUpperCase(), analysis: str(a?.analysis, 600) }))
      .filter((a) => a.analysis);
    if (analysis.length) q.optionAnalysis = analysis;
  }
  if (!errors.length) q.negativeMarks = defaultNegativeMarks(type, q.marks);

  if (!errors.length) {
    for (const e of validateQuestionRules(q)) errors.push(`${e.path}: ${e.message}`);
  }
  return errors.length ? { ok: false, errors } : { ok: true, question: q, errors: [] };
}

const toLetters = (s) => [...String(s ?? '').toUpperCase().matchAll(/\b([A-F])\b/g)].map((m) => m[1]);

/**
 * Compares an independent solver result { answer, ambiguous, ambiguityNote } with the question's key.
 * Returns { agrees, solverAnswer, ambiguous, note }. This is a programmatic comparison, not a model opinion.
 */
export function compareSolverAnswer(q, result) {
  const solverAnswer = String(result?.answer ?? '').trim();
  const base = { solverAnswer, ambiguous: Boolean(result?.ambiguous), note: str(result?.ambiguityNote, 400) };
  let agrees = false;
  if (q.type === 'MCQ') {
    const letters = toLetters(solverAnswer);
    agrees = letters.length === 1 && letters[0] === q.correctOptions[0];
  } else if (q.type === 'MSQ') {
    const got = [...new Set(toLetters(solverAnswer))].sort();
    agrees = got.length > 0 && got.join() === [...q.correctOptions].sort().join();
  } else if (q.type === 'NAT') {
    const v = Number(solverAnswer.replace(/[^\d.eE+-]/g, ''));
    agrees = Number.isFinite(v) && q.natAnswer && v >= q.natAnswer.min - 1e-6 && v <= q.natAnswer.max + 1e-6;
  }
  return { ...base, agrees: Boolean(agrees) && !base.ambiguous };
}

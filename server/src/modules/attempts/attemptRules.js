// Pure functions for the exam engine: no database, no framework, no clock except what is passed in.
import { DEFAULT_MARKING, effectiveNegativeMarks } from '../tests/testRules.js';

/** Saves are still accepted this long after expiry, to forgive network latency on the last autosave. */
export const GRACE_MS = 5000;
export const NAT_PATTERN = /^-?\d*\.?\d*$/;
export const NAT_MAX_LENGTH = 16;
const EPS = 1e-9;

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10_000) / 10_000;
const ts = (d) => new Date(d).getTime();

// ---------------- time (all derived from server-stored timestamps) ----------------
export const remainingMs = (expiresAt, now) => Math.max(0, ts(expiresAt) - now);
export const isExpired = (expiresAt, now) => now >= ts(expiresAt);
export const isPastGrace = (expiresAt, now) => now > ts(expiresAt) + GRACE_MS;

// ---------------- answers ----------------
/**
 * Validates and normalises a submitted answer against the question (type and option keys).
 * Returns { ok: true, value } where value is null for "no answer", or { ok: false, message }.
 */
export function normalizeAnswer(question, answer) {
  if (answer == null) return { ok: true, value: null };
  const keys = (question.options ?? []).map((o) => o.key);

  if (question.type === 'MCQ') {
    if (answer === '') return { ok: true, value: null };
    if (typeof answer !== 'string' || !keys.includes(answer)) return { ok: false, message: 'Choose one of the listed options.' };
    return { ok: true, value: answer };
  }
  if (question.type === 'MSQ') {
    if (!Array.isArray(answer)) return { ok: false, message: 'MSQ answers must be a list of option keys.' };
    if (new Set(answer).size !== answer.length || answer.some((k) => !keys.includes(k))) {
      return { ok: false, message: 'Choose distinct options from the listed ones.' };
    }
    return { ok: true, value: answer.length ? [...answer].sort() : null };
  }
  if (question.type === 'NAT') {
    if (typeof answer !== 'string') return { ok: false, message: 'NAT answers must be text containing a number.' };
    const text = answer.trim();
    if (text === '') return { ok: true, value: null };
    if (text.length > NAT_MAX_LENGTH || !NAT_PATTERN.test(text)) return { ok: false, message: 'Enter a valid number.' };
    return { ok: true, value: text };
  }
  return { ok: false, message: 'Unknown question type.' };
}

/** Partial NAT input such as "-" or "." is not an answer. */
export function hasAnswer(answer) {
  if (answer == null) return false;
  if (Array.isArray(answer)) return answer.length > 0;
  const text = String(answer).trim();
  return text !== '' && text !== '-' && text !== '.' && text !== '-.';
}

// ---------------- evaluation ----------------
/** One question. `key` = { correctOptions, natAnswer: { min, max } }. Returns { outcome, marksAwarded }. */
export function gradeQuestion(q, key, answer) {
  if (!hasAnswer(answer)) return { outcome: 'unanswered', marksAwarded: 0 };

  let correct = false;
  if (q.type === 'MCQ') {
    correct = typeof answer === 'string' && answer === key.correctOptions?.[0];
  } else if (q.type === 'MSQ') {
    const given = new Set(Array.isArray(answer) ? answer : []);
    const right = new Set(key.correctOptions ?? []);
    correct = given.size === right.size && [...given].every((k) => right.has(k)); // exact set, no partial credit
  } else if (q.type === 'NAT') {
    const value = Number(answer);
    if (!Number.isFinite(value)) return { outcome: 'unanswered', marksAwarded: 0 };
    const { min, max } = key.natAnswer ?? {};
    correct = Number.isFinite(min) && Number.isFinite(max) && value >= min - EPS && value <= max + EPS;
  }

  if (correct) return { outcome: 'correct', marksAwarded: q.marks };
  // Only MCQ can lose marks, and by the amount frozen in the attempt snapshot.
  return { outcome: 'incorrect', marksAwarded: q.type === 'MCQ' ? -(q.negativeMarks ?? 0) : 0 };
}

/**
 * Whole attempt. questions/answerKey/responses are index-aligned arrays from the attempt snapshot.
 * Marks and negative marks come only from the snapshot, never from the live question bank.
 */
export function evaluateAttempt({ questions, answerKey, responses }) {
  let score = 0;
  let totalMarks = 0;
  const counts = { correct: 0, incorrect: 0, unanswered: 0 };
  const subjects = new Map();
  const perQuestion = [];

  questions.forEach((q, i) => {
    const { outcome, marksAwarded } = gradeQuestion(q, answerKey[i] ?? {}, responses[i]?.answer);
    counts[outcome] += 1;
    score += marksAwarded;
    totalMarks += q.marks;
    perQuestion.push({ outcome, marksAwarded: round4(marksAwarded) });

    const id = String(q.subjectId);
    if (!subjects.has(id)) {
      subjects.set(id, { subjectId: q.subjectId, subjectName: q.subjectName, totalQuestions: 0, correct: 0, incorrect: 0, unanswered: 0, marksObtained: 0, maxMarks: 0 });
    }
    const s = subjects.get(id);
    s.totalQuestions += 1;
    s[outcome] += 1;
    s.marksObtained += marksAwarded;
    s.maxMarks += q.marks;
  });

  const accuracyOf = (c, w) => (c + w === 0 ? 0 : round2((c / (c + w)) * 100));
  return {
    score: round2(score),
    totalMarks: round2(totalMarks),
    ...counts,
    attempted: counts.correct + counts.incorrect,
    accuracy: accuracyOf(counts.correct, counts.incorrect), // correct / attempted
    subjectBreakdown: [...subjects.values()].map((s) => ({
      ...s,
      marksObtained: round2(s.marksObtained),
      maxMarks: round2(s.maxMarks),
      accuracy: accuracyOf(s.correct, s.incorrect),
    })),
    perQuestion,
  };
}

// ---------------- snapshot ----------------
/**
 * Freezes a test (or a custom practice set) into attempt content.
 * test: { title, kind, mode, durationMinutes, marking, sections: [{ name, questionIds }] }
 * questions: Map(idString -> plain question including its answer key).
 * Throws Error('MISSING_QUESTION:<id>') if a referenced question no longer exists.
 */
export function buildAttemptContent({ test, questions, subjectNames, topicNames }) {
  const marking = { ...DEFAULT_MARKING, ...(test.marking ?? {}) };
  const snap = [];
  const answerKey = [];
  const sections = [];

  test.sections.forEach((section, sectionIndex) => {
    const startIndex = snap.length;
    for (const id of section.questionIds.map(String)) {
      const q = questions.get(id);
      if (!q) throw new Error(`MISSING_QUESTION:${id}`);
      snap.push({
        qid: q._id,
        type: q.type,
        statement: q.statement,
        code: q.code || undefined,
        options: (q.options ?? []).map((o) => ({ key: o.key, text: o.text })),
        marks: q.marks,
        negativeMarks: effectiveNegativeMarks(q, marking),
        sectionIndex,
        subjectId: q.subjectId,
        subjectName: subjectNames.get(String(q.subjectId)) ?? 'Unknown subject',
        topicId: q.topicId,
        topicName: topicNames.get(String(q.topicId)) ?? 'Unknown topic',
      });
      answerKey.push({
        correctOptions: q.correctOptions ?? [],
        natAnswer: q.natAnswer ? { min: q.natAnswer.min, max: q.natAnswer.max } : undefined,
        explanation: q.explanation || undefined,
      });
    }
    sections.push({ name: section.name, startIndex, count: snap.length - startIndex });
  });

  return {
    testSnapshot: {
      title: test.title,
      kind: test.kind,
      mode: test.mode,
      durationMinutes: test.durationMinutes,
      marking: {
        negativeMarkingEnabled: marking.negativeMarkingEnabled,
        mcqNegativeFraction: marking.mcqNegativeFraction,
        useQuestionNegativeMarks: Boolean(marking.useQuestionNegativeMarks),
      },
      totalQuestions: snap.length,
      totalMarks: round2(snap.reduce((sum, q) => sum + q.marks, 0)),
      sections,
    },
    questions: snap,
    answerKey,
    // Question 1 counts as visited the moment the exam opens.
    responses: snap.map((_, i) => ({ answer: null, visited: i === 0, marked: false, seq: 0 })),
  };
}

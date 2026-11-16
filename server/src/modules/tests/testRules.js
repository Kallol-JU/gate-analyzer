// Pure functions: no database, no framework.

export const TEST_KINDS = ['mock', 'subject', 'topic', 'pyq', 'ai_practice'];
export const TEST_MODES = ['competitive', 'practice'];
export const TEST_STATUSES = ['draft', 'published'];
export const MAX_QUESTIONS_PER_TEST = 200;
export const MAX_AI_QUESTIONS = 65;

export const DEFAULT_MARKING = { negativeMarkingEnabled: true, mcqNegativeFraction: 1 / 3, useQuestionNegativeMarks: false };

/**
 * Marks lost for a wrong answer under a test's marking configuration.
 * The test's configuration overrides the per-question default. Only MCQ can be negative.
 * (Used by the evaluation engine in a later milestone.)
 */
export function effectiveNegativeMarks(question, marking = DEFAULT_MARKING) {
  if (question.type !== 'MCQ' || !marking.negativeMarkingEnabled) return 0;
  // Optional: honour each question's own negative marks instead of the test-wide fraction.
  if (marking.useQuestionNegativeMarks && Number.isFinite(question.negativeMarks)) return question.negativeMarks;
  return Math.round(question.marks * marking.mcqNegativeFraction * 10_000) / 10_000;
}

const sectionIds = (t) => (t.sections ?? []).flatMap((s) => (s.questionIds ?? []).map(String));

/** Structural rules. Input is a plain object. Returns [{ path, message }]. */
export function validateTestConfig(t) {
  const errors = [];
  const add = (path, message) => errors.push({ path, message });

  if (!TEST_KINDS.includes(t.kind)) add('kind', `Kind must be one of ${TEST_KINDS.join(', ')}.`);
  if (!TEST_MODES.includes(t.mode)) add('mode', 'Mode must be competitive or practice.');
  if (!Number.isInteger(t.durationMinutes) || t.durationMinutes < 1 || t.durationMinutes > 600) {
    add('durationMinutes', 'Duration must be a whole number of minutes between 1 and 600.');
  }

  const names = (t.sections ?? []).map((s) => String(s.name ?? '').trim().toLowerCase());
  if (names.some((n) => !n)) add('sections', 'Every section needs a name.');
  if (new Set(names).size !== names.length) add('sections', 'Section names must be unique.');

  const ids = sectionIds(t);
  if (new Set(ids).size !== ids.length) add('sections', 'A question cannot appear twice in a test.');
  if (ids.length > MAX_QUESTIONS_PER_TEST) add('sections', `A test can have at most ${MAX_QUESTIONS_PER_TEST} questions.`);

  if (t.kind === 'ai_practice') {
    if (t.mode !== 'practice') add('mode', 'AI practice tests are private practice, never competitive.');
    if (ids.length > 0) add('sections', 'AI practice tests are generated per student and have no fixed questions.');
    const c = t.blueprint?.counts;
    const total = c ? (c.MCQ ?? 0) + (c.MSQ ?? 0) + (c.NAT ?? 0) : 0;
    if (!t.blueprint) add('blueprint', 'AI practice tests need a blueprint.');
    else if (total < 1 || total > MAX_AI_QUESTIONS) add('blueprint.counts', `Total questions must be between 1 and ${MAX_AI_QUESTIONS}.`);
    if (t.blueprint?.topicId && !t.blueprint?.subjectId) add('blueprint.subjectId', 'A topic needs its subject.');
  } else if (t.blueprint) {
    add('blueprint', 'Only AI practice tests have a blueprint.');
  }

  if (t.kind === 'subject' && !t.scope?.subjectId) add('scope.subjectId', 'Subject-wise tests need a subject.');
  if (t.kind === 'topic' && (!t.scope?.subjectId || !t.scope?.topicId)) {
    add('scope', 'Topic-wise tests need a subject and a topic.');
  }
  if (t.scope?.topicId && !t.scope?.subjectId) add('scope.subjectId', 'A topic needs its subject.');

  const m = t.marking;
  if (m && (!(m.mcqNegativeFraction >= 0) || m.mcqNegativeFraction > 1)) {
    add('marking.mcqNegativeFraction', 'The MCQ negative fraction must be between 0 and 1.');
  }
  return errors;
}

/**
 * Rules that need the actual questions: used before publishing.
 * `questions` are plain objects { _id|id, status, visibility, source, subjectId, topicId }.
 */
export function validatePublishable(t, questions) {
  const errors = [];
  const add = (path, message) => errors.push({ path, message });

  const ids = sectionIds(t);
  if (ids.length === 0) {
    add('sections', 'Add at least one question before publishing.');
    return errors;
  }
  const byId = new Map(questions.map((q) => [String(q._id ?? q.id), q]));

  for (const id of new Set(ids)) {
    const q = byId.get(id);
    if (!q) {
      add('sections', `Question ${id} does not exist.`);
      continue;
    }
    if (q.status !== 'published') add('sections', `Question ${id} is not published (status: ${q.status}).`);
    if (q.visibility && q.visibility !== 'public') add('sections', `Question ${id} is private and cannot be used in a public test.`);
    if (t.kind === 'pyq' && q.source !== 'PYQ') add('sections', `Question ${id} is not a PYQ, so it cannot be in a PYQ test.`);
    if (t.kind === 'subject' && String(q.subjectId) !== String(t.scope?.subjectId)) {
      add('sections', `Question ${id} is not in this test's subject.`);
    }
    if (t.kind === 'topic' && String(q.topicId) !== String(t.scope?.topicId)) {
      add('sections', `Question ${id} is not in this test's topic.`);
    }
  }
  return errors;
}

/** Totals and distribution shown to students and stored on the test. */
export function computeDistribution(questions) {
  const byType = { MCQ: 0, MSQ: 0, NAT: 0 };
  const subjects = new Map();
  let totalMarks = 0;
  for (const q of questions) {
    byType[q.type] += 1;
    totalMarks += q.marks;
    const sid = String(q.subjectId);
    subjects.set(sid, (subjects.get(sid) ?? 0) + 1);
  }
  return {
    totalQuestions: questions.length,
    totalMarks: Math.round(totalMarks * 100) / 100,
    distribution: {
      byType,
      bySubject: [...subjects].map(([subjectId, count]) => ({ subjectId, count })),
    },
  };
}

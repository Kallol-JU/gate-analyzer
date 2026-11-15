// Pure functions: no database, no framework. Unit-tested without any dependencies.

export const QUESTION_TYPES = ['MCQ', 'MSQ', 'NAT'];
export const DIFFICULTIES = ['easy', 'medium', 'hard'];
export const QUESTION_SOURCES = ['PYQ', 'AI', 'ADMIN'];
export const QUESTION_STATUSES = ['draft', 'pending', 'published'];
export const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];
export const PYQ_MIN_YEAR = 1987;
export const PYQ_MAX_YEAR = 2100;

/** GATE convention: MCQ loses 1/3 of its marks when wrong; MSQ and NAT have no negative marking. */
export function defaultNegativeMarks(type, marks) {
  if (type !== 'MCQ') return 0;
  return Math.round((marks / 3) * 10_000) / 10_000;
}

/**
 * Returns a list of { path, message }. Empty list means the question is valid.
 * Input is a plain object: { type, options, correctOptions, natAnswer, marks, negativeMarks, source, pyq }.
 */
export function validateQuestionRules(q) {
  const errors = [];
  const add = (path, message) => errors.push({ path, message });

  if (!QUESTION_TYPES.includes(q.type)) {
    add('type', 'Type must be MCQ, MSQ or NAT.');
    return errors;
  }

  const options = q.options ?? [];
  const correct = q.correctOptions ?? [];
  const nat = q.natAnswer;

  if (q.type === 'NAT') {
    if (options.length > 0) add('options', 'NAT questions must not have options.');
    if (correct.length > 0) add('correctOptions', 'NAT questions must not have correct options.');
    if (!nat || !Number.isFinite(nat.min) || !Number.isFinite(nat.max)) {
      add('natAnswer', 'NAT questions need a numeric answer range { min, max }.');
    } else if (nat.min > nat.max) {
      add('natAnswer', 'natAnswer.min must not be greater than natAnswer.max.');
    }
  } else {
    if (nat && (nat.min != null || nat.max != null)) add('natAnswer', 'Only NAT questions have a numeric answer.');

    const keys = options.map((o) => o.key);
    if (options.length < 2) add('options', 'MCQ and MSQ questions need at least 2 options.');
    if (new Set(keys).size !== keys.length) add('options', 'Option keys must be unique.');
    if (keys.some((k) => !OPTION_KEYS.includes(k))) add('options', `Option keys must be from ${OPTION_KEYS.join(', ')}.`);
    if (options.some((o) => !String(o.text ?? '').trim())) add('options', 'Every option needs text.');

    if (new Set(correct).size !== correct.length) add('correctOptions', 'Correct options must not repeat.');
    if (correct.some((k) => !keys.includes(k))) add('correctOptions', 'Every correct option must be one of the option keys.');
    if (q.type === 'MCQ' && correct.length !== 1) add('correctOptions', 'An MCQ must have exactly one correct option.');
    if (q.type === 'MSQ' && correct.length < 1) add('correctOptions', 'An MSQ must have at least one correct option.');
  }

  if (!Number.isFinite(q.marks) || q.marks <= 0) {
    add('marks', 'Marks must be a positive number.');
  } else if (q.negativeMarks != null && (!Number.isFinite(q.negativeMarks) || q.negativeMarks < 0 || q.negativeMarks > q.marks)) {
    add('negativeMarks', 'Negative marks must be between 0 and the question marks.');
  }

  const pyq = q.pyq;
  if (q.source === 'PYQ') {
    if (!pyq || !Number.isInteger(pyq.year) || pyq.year < PYQ_MIN_YEAR || pyq.year > PYQ_MAX_YEAR) {
      add('pyq.year', `PYQ questions need a year between ${PYQ_MIN_YEAR} and ${PYQ_MAX_YEAR}.`);
    }
    if (!pyq || !String(pyq.session ?? '').trim()) add('pyq.session', 'PYQ questions need a session (for example "Set 1").');
  } else if (pyq && (pyq.year != null || pyq.session)) {
    add('pyq', 'Only questions with source PYQ may have year and session. AI and admin questions must not be labelled as PYQs.');
  }

  return errors;
}

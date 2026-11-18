// Pure functions: no database, no framework. Unit-tested without any dependencies.

export const QUESTION_TYPES = ['MCQ', 'MSQ', 'NAT'];
export const DIFFICULTIES = ['easy', 'medium', 'hard', 'very_hard'];
// PYQ = authentic previous-year question. PYQ_INSPIRED = original question modelled on a PYQ's concept.
// ADVANCED = original higher-order question. AI and ADMIN are the original generic sources (kept for old data).
export const QUESTION_SOURCES = ['PYQ', 'PYQ_INSPIRED', 'ADVANCED', 'AI', 'ADMIN'];
// Sources that need an explicit review before students can see them. ADMIN (legacy) keeps its old behaviour.
export const REVIEWED_SOURCES = ['PYQ', 'PYQ_INSPIRED', 'ADVANCED', 'AI'];
// Content-correctness review, separate from `status` (which controls student visibility).
// A missing value means "legacy question, created before review existed".
export const VERIFICATION_STATUSES = ['draft', 'pending_review', 'verified', 'rejected'];
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

  errors.push(...validateReviewRules(q));
  return errors;
}

const isHttpUrl = (v) => {
  try {
    const u = new URL(String(v));
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
};

/** Publication and verification rules. Only applies when the caller supplies the relevant fields. */
function validateReviewRules(q) {
  const errors = [];
  const add = (path, message) => errors.push({ path, message });
  const reviewed = REVIEWED_SOURCES.includes(q.source);

  if (q.verificationStatus != null && !VERIFICATION_STATUSES.includes(q.verificationStatus)) {
    add('verificationStatus', `Verification status must be one of ${VERIFICATION_STATUSES.join(', ')}.`);
  }
  if (q.status === 'published' && q.verificationStatus === 'rejected') {
    add('status', 'A rejected question cannot be published.');
  }
  // The invariant that keeps unverified content away from students: reviewed sources need `verified` to be published.
  if (q.status === 'published' && reviewed && q.verificationStatus !== 'verified') {
    add('status', 'This question must be verified before it can be published.');
  }
  if (q.verificationStatus === 'verified' && reviewed && !String(q.explanation ?? '').trim()) {
    add('explanation', 'A verified question needs an explanation.');
  }
  // An authentic PYQ is only "verified" if its official source and answer key are recorded.
  if (q.source === 'PYQ' && q.verificationStatus === 'verified') {
    const ref = q.sourceReference ?? {};
    if (!isHttpUrl(ref.paperUrl)) add('sourceReference.paperUrl', 'A verified PYQ needs the URL of the official question paper.');
    if (!String(ref.answerKeyRef ?? '').trim()) add('sourceReference.answerKeyRef', 'A verified PYQ needs a reference to the official answer key (URL or document name).');
  }
  if (q.sourceReference?.paperUrl && !isHttpUrl(q.sourceReference.paperUrl)) {
    add('sourceReference.paperUrl', 'The paper URL must start with http:// or https://.');
  }
  if (q.source !== 'PYQ_INSPIRED' && q.inspiredByQuestionId && q.source === 'PYQ') {
    add('inspiredByQuestionId', 'An authentic PYQ cannot be inspired by another question.');
  }
  return errors;
}

import mongoose from 'mongoose';
import { ADMIN_SELECT, Question } from '../../models/Question.js';
import { Subject } from '../../models/Subject.js';
import { Test } from '../../models/Test.js';
import { TestAttempt } from '../../models/TestAttempt.js';
import { Topic } from '../../models/Topic.js';
import { ApiError } from '../../utils/ApiError.js';
import { DEFAULT_MARKING } from '../tests/testRules.js';
import { buildAttemptContent, evaluateAttempt, GRACE_MS, isExpired, isPastGrace, normalizeAnswer } from './attemptRules.js';

const ACTIVE = 'in_progress';

// ---------------- creating attempts ----------------
async function loadNames(docs) {
  const subjectIds = [...new Set(docs.map((d) => String(d.subjectId)))];
  const topicIds = [...new Set(docs.map((d) => String(d.topicId)))];
  const [subjects, topics] = await Promise.all([Subject.find({ _id: { $in: subjectIds } }), Topic.find({ _id: { $in: topicIds } })]);
  return {
    subjectNames: new Map(subjects.map((s) => [String(s._id), s.name])),
    topicNames: new Map(topics.map((t) => [String(t._id), t.name])),
  };
}

/** The server decides start and expiry. Nothing about time or marking comes from the client. */
async function createAttempt({ userId, testId, kind, mode, content }) {
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + content.testSnapshot.durationMinutes * 60_000);
  try {
    const attempt = await TestAttempt.create({ userId, testId, kind, mode, ...content, startedAt, expiresAt });
    return { attempt, resumed: false };
  } catch (err) {
    if (err?.code !== 11000) throw err;
    // A concurrent request created the active attempt first (partial unique index): use that one.
    const existing = await TestAttempt.findOne({ userId, ...(testId ? { testId } : { kind: 'custom' }), status: ACTIVE });
    if (!existing) throw err;
    if (!testId) throw activePracticeError(existing);
    return { attempt: existing, resumed: true };
  }
}

const activePracticeError = (a) =>
  new ApiError(409, 'ACTIVE_PRACTICE_EXISTS', 'You already have a practice test in progress.', [{ path: 'attemptId', message: String(a._id) }]);

export async function startTestAttempt(userId, testId) {
  await finalizeExpiredForUser(userId);
  const existing = await TestAttempt.findOne({ userId, testId, status: ACTIVE });
  if (existing) return { attempt: existing, resumed: true };

  const test = await Test.findOne({ _id: testId, status: 'published' });
  if (!test) throw new ApiError(404, 'TEST_NOT_FOUND', 'Test not found.');
  if (test.kind === 'ai_practice') throw new ApiError(409, 'AI_NOT_AVAILABLE', 'AI practice tests are not available yet.');

  const t = test.toObject();
  const ids = t.sections.flatMap((s) => s.questionIds.map(String));
  const docs = await Question.find({ _id: { $in: ids } }).select(ADMIN_SELECT);
  const { subjectNames, topicNames } = await loadNames(docs);

  let content;
  try {
    content = buildAttemptContent({ test: t, questions: new Map(docs.map((d) => [String(d._id), d.toObject()])), subjectNames, topicNames });
  } catch (err) {
    if (String(err.message).startsWith('MISSING_QUESTION')) throw new ApiError(409, 'TEST_UNAVAILABLE', 'This test is temporarily unavailable.');
    throw err;
  }
  if (content.questions.length === 0) throw new ApiError(409, 'TEST_UNAVAILABLE', 'This test has no questions.');
  return createAttempt({ userId, testId: test._id, kind: test.kind, mode: test.mode, content });
}

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Private practice test built from the published question bank. Never competitive. */
export async function startCustomPractice(userId, { subjectId, topicId, difficulty, count }) {
  await finalizeExpiredForUser(userId);
  const active = await TestAttempt.findOne({ userId, kind: 'custom', status: ACTIVE });
  if (active) throw activePracticeError(active);

  const subject = await Subject.findById(subjectId);
  if (!subject) throw new ApiError(400, 'SUBJECT_NOT_FOUND', 'Subject does not exist.');
  let topic = null;
  if (topicId) {
    topic = await Topic.findOne({ _id: topicId, subjectId });
    if (!topic) throw new ApiError(400, 'TAXONOMY_MISMATCH', 'The topic does not belong to the subject.');
  }

  const filter = { status: 'published', visibility: 'public', subjectId, ...(topicId && { topicId }), ...(difficulty && { difficulty }) };
  const available = await Question.distinct('_id', filter);
  if (available.length < count) {
    throw new ApiError(409, 'NOT_ENOUGH_QUESTIONS', `Only ${available.length} matching question(s) are available. Choose fewer questions or a wider selection.`);
  }
  const picked = shuffle(available).slice(0, count);
  const docs = await Question.find({ _id: { $in: picked } }).select(ADMIN_SELECT);
  const { subjectNames, topicNames } = await loadNames(docs);

  const content = buildAttemptContent({
    test: {
      title: `Private practice: ${subject.name}${topic ? ` · ${topic.name}` : ''}`,
      kind: 'custom',
      mode: 'practice',
      durationMinutes: count * 3,
      marking: DEFAULT_MARKING,
      sections: [{ name: 'Practice', questionIds: picked }],
    },
    questions: new Map(docs.map((d) => [String(d._id), d.toObject()])),
    subjectNames,
    topicNames,
  });
  return createAttempt({ userId, kind: 'custom', mode: 'practice', content });
}

// ---------------- finalising (submit and expiry share this one path) ----------------
/**
 * Evaluates and closes an attempt exactly once. Safe to call repeatedly and concurrently:
 *  - if the attempt is already closed, it is returned untouched (idempotent);
 *  - the closing write is conditional on { status: 'in_progress', version }, so only one caller
 *    can win, and a save that lands mid-evaluation forces a re-evaluation instead of being lost.
 * Expired attempts are closed as 'auto_submitted' with submittedAt = expiresAt.
 */
export async function finalizeAttempt(attemptId) {
  for (let i = 0; i < 5; i += 1) {
    const a = await TestAttempt.findById(attemptId).select('+answerKey');
    if (!a) return null;
    if (a.status !== ACTIVE) return a;

    const now = Date.now();
    const expired = isExpired(a.expiresAt, now);
    const endAt = expired ? new Date(a.expiresAt) : new Date(now);
    const plain = a.toObject();
    const result = evaluateAttempt({ questions: plain.questions, answerKey: plain.answerKey, responses: plain.responses });

    const updated = await TestAttempt.findOneAndUpdate(
      { _id: a._id, status: ACTIVE, version: a.version },
      {
        $set: {
          status: expired ? 'auto_submitted' : 'submitted',
          submittedAt: endAt,
          timeTakenSec: Math.max(0, Math.round((endAt.getTime() - a.startedAt.getTime()) / 1000)),
          result,
        },
        $inc: { version: 1 },
      },
      { new: true },
    );
    if (updated) return updated;
  }
  throw new ApiError(409, 'CONCURRENT_UPDATE', 'The exam is being updated. Please try again.');
}

export async function finalizeExpiredForUser(userId) {
  const due = await TestAttempt.find({ userId, status: ACTIVE, expiresAt: { $lte: new Date() } }).select('_id');
  for (const a of due) await finalizeAttempt(a._id);
}

export async function sweepExpiredAttempts(limit = 100) {
  const due = await TestAttempt.find({ status: ACTIVE, expiresAt: { $lte: new Date() } }).select('_id').limit(limit);
  for (const a of due) await finalizeAttempt(a._id);
  return due.length;
}

// ---------------- reading ----------------
/** Ownership is part of the query: someone else's attempt is indistinguishable from a missing one. */
export async function getOwnedAttempt(userId, id, { withKey = false } = {}) {
  const load = () => (withKey ? TestAttempt.findOne({ _id: id, userId }).select('+answerKey') : TestAttempt.findOne({ _id: id, userId }));
  let a = await load();
  if (!a) throw new ApiError(404, 'ATTEMPT_NOT_FOUND', 'Attempt not found.');
  if (a.status === ACTIVE && isExpired(a.expiresAt, Date.now())) {
    await finalizeAttempt(a._id);
    a = await load();
  }
  return a;
}

export async function listHistory(userId, { page, limit, status }) {
  await finalizeExpiredForUser(userId);
  const filter = { userId, ...(status && { status }) };
  const [items, total] = await Promise.all([
    TestAttempt.find(filter).select('-questions -responses').sort({ startedAt: -1 }).skip((page - 1) * limit).limit(limit),
    TestAttempt.countDocuments(filter),
  ]);
  return { items, total };
}

export async function listActive(userId) {
  await finalizeExpiredForUser(userId);
  return TestAttempt.find({ userId, status: ACTIVE }).select('-questions -responses').sort({ startedAt: -1 });
}

// ---------------- saving answers ----------------
/**
 * Applies a batch of { index, answer, marked, visited, seq }. Each update is atomic and only applied
 * when its seq is higher than the stored one, so retries, duplicates and out-of-order requests are harmless.
 */
export async function saveResponses(userId, id, updates) {
  const now = Date.now();
  const a = await TestAttempt.findOne({ _id: id, userId }).select('status expiresAt startedAt questions.type questions.options.key');
  if (!a) throw new ApiError(404, 'ATTEMPT_NOT_FOUND', 'Attempt not found.');
  if (a.status !== ACTIVE) throw new ApiError(409, 'ATTEMPT_CLOSED', 'This exam has already been submitted.');
  if (isPastGrace(a.expiresAt, now)) {
    await finalizeAttempt(a._id);
    throw new ApiError(409, 'ATTEMPT_EXPIRED', 'Time is up. Your exam was submitted automatically.');
  }

  // Latest seq per question wins; validate every answer against that question's type and options.
  const latest = new Map();
  for (const u of updates) if (!latest.has(u.index) || latest.get(u.index).seq < u.seq) latest.set(u.index, u);

  const errors = [];
  const ops = [];
  for (const u of latest.values()) {
    const question = a.questions[u.index];
    if (!question) {
      errors.push({ path: `updates.${u.index}`, message: 'No such question.' });
      continue;
    }
    const checked = normalizeAnswer(question, u.answer);
    if (!checked.ok) {
      errors.push({ path: `updates.${u.index}.answer`, message: checked.message });
      continue;
    }
    const p = `responses.${u.index}`;
    ops.push({
      updateOne: {
        filter: { _id: a._id, userId, status: ACTIVE, expiresAt: { $gt: new Date(now - GRACE_MS) }, [`${p}.seq`]: { $lt: u.seq } },
        update: {
          $set: { [`${p}.answer`]: checked.value, [`${p}.marked`]: u.marked, [`${p}.visited`]: u.visited, [`${p}.seq`]: u.seq, [`${p}.updatedAt`]: new Date(now) },
          $inc: { version: 1 },
        },
      },
    });
  }
  if (errors.length) throw new ApiError(400, 'VALIDATION_ERROR', 'Some answers are invalid.', errors);

  const res = ops.length ? await TestAttempt.bulkWrite(ops, { ordered: false }) : { modifiedCount: 0 };
  const fresh = await TestAttempt.findById(a._id).select('status expiresAt startedAt');
  return { applied: res.modifiedCount, stale: ops.length - res.modifiedCount, attempt: fresh };
}

export async function submitAttempt(userId, id) {
  const owned = await TestAttempt.exists({ _id: id, userId });
  if (!owned) throw new ApiError(404, 'ATTEMPT_NOT_FOUND', 'Attempt not found.');
  return finalizeAttempt(id); // returns the stored attempt unchanged if it was already closed
}

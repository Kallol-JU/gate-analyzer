import { Question } from '../../models/Question.js';
import { Test, testToPlain } from '../../models/Test.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendPage } from '../../utils/http.js';
import { toAdminTest, toStudentTest } from './testSerializer.js';
import { computeDistribution, validatePublishable } from './testRules.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const idsOf = (test) => test.sections.flatMap((s) => s.questionIds.map(String));

async function findTest(id) {
  const test = await Test.findById(id);
  if (!test) throw new ApiError(404, 'TEST_NOT_FOUND', 'Test not found.');
  return test;
}

/** Loads the test's questions, rejects unknown ids, and refreshes totals and distribution. */
async function refreshStats(test) {
  const ids = [...new Set(idsOf(test))];
  const questions = await Question.find({ _id: { $in: ids } }).select('type marks subjectId topicId status visibility source');
  const found = new Set(questions.map((q) => String(q._id)));
  const missing = ids.filter((id) => !found.has(id));
  if (missing.length) throw new ApiError(400, 'UNKNOWN_QUESTIONS', 'Some question ids do not exist.', missing.map((id) => ({ path: 'sections', message: `Unknown question ${id}` })));

  const stats = computeDistribution(questions);
  test.totalQuestions = stats.totalQuestions;
  test.totalMarks = stats.totalMarks;
  test.distribution = stats.distribution;
  return questions;
}

async function assertPublishable(test, questions) {
  if (test.kind === 'ai_practice') {
    throw new ApiError(409, 'AI_NOT_AVAILABLE', 'AI practice tests can be published once AI question generation is available.');
  }
  const errors = validatePublishable(testToPlain(test), questions);
  if (errors.length) throw new ApiError(409, 'NOT_PUBLISHABLE', 'The test cannot be published yet.', errors);
}

// A published competitive test is locked: its questions, duration and marking must not change
// under students who may already be ranked on it. Only wording can be edited.
const LOCK_EXEMPT = new Set(['title', 'description']);
const isLocked = (test) => test.status === 'published' && test.mode === 'competitive';

// ---------------- student ----------------
export const listForStudents = asyncHandler(async (req, res) => {
  const { page, limit, ...rest } = req.query;
  const filter = { status: 'published', ...rest };
  const [items, total] = await Promise.all([
    Test.find(filter).sort({ publishedAt: -1 }).skip((page - 1) * limit).limit(limit),
    Test.countDocuments(filter),
  ]);
  sendPage(res, items.map(toStudentTest), { page, limit, total });
});

export const getForStudent = asyncHandler(async (req, res) => {
  const test = await Test.findOne({ _id: req.params.id, status: 'published' });
  if (!test) throw new ApiError(404, 'TEST_NOT_FOUND', 'Test not found.');
  ok(res, toStudentTest(test));
});

// ---------------- admin ----------------
export const listForAdmin = asyncHandler(async (req, res) => {
  const { page, limit, ...filter } = req.query;
  const [items, total] = await Promise.all([
    Test.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Test.countDocuments(filter),
  ]);
  sendPage(res, items.map(toAdminTest), { page, limit, total });
});

export const getForAdmin = asyncHandler(async (req, res) => ok(res, toAdminTest(await findTest(req.params.id))));

export const createTest = asyncHandler(async (req, res) => {
  const test = new Test({ ...req.body, createdBy: req.user.id });
  await refreshStats(test);
  await test.save();
  ok(res, toAdminTest(test), 201);
});

export const updateTest = asyncHandler(async (req, res) => {
  const test = await findTest(req.params.id);
  if (isLocked(test) && Object.keys(req.body).some((k) => !LOCK_EXEMPT.has(k))) {
    throw new ApiError(409, 'TEST_LOCKED', 'A published competitive test is locked. Unpublish it or clone it to change questions, duration or marking.');
  }
  test.set(req.body);
  const questions = await refreshStats(test);
  if (test.status === 'published') await assertPublishable(test, questions);
  await test.save();
  ok(res, toAdminTest(test));
});

export const deleteTest = asyncHandler(async (req, res) => {
  const test = await findTest(req.params.id);
  if (test.status === 'published') throw new ApiError(409, 'TEST_PUBLISHED', 'Unpublish the test before deleting it.');
  await test.deleteOne();
  ok(res, { deleted: true });
});

export const publishTest = asyncHandler(async (req, res) => {
  const test = await findTest(req.params.id);
  const questions = await refreshStats(test);
  await assertPublishable(test, questions);
  test.status = 'published';
  test.publishedAt = new Date();
  await test.save();
  ok(res, toAdminTest(test));
});

export const unpublishTest = asyncHandler(async (req, res) => {
  const test = await findTest(req.params.id);
  test.status = 'draft';
  test.publishedAt = undefined;
  await test.save();
  ok(res, toAdminTest(test));
});

export const cloneTest = asyncHandler(async (req, res) => {
  const source = await findTest(req.params.id);
  const o = source.toObject();
  const copy = new Test({
    title: `${o.title} (copy)`.slice(0, 120),
    description: o.description,
    kind: o.kind,
    mode: o.mode,
    durationMinutes: o.durationMinutes,
    sections: o.sections,
    scope: o.scope,
    blueprint: o.blueprint,
    marking: o.marking,
    createdBy: req.user.id,
  });
  await refreshStats(copy);
  await copy.save();
  ok(res, toAdminTest(copy), 201);
});

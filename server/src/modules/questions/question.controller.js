import { ADMIN_FULL_SELECT, Question } from '../../models/Question.js';
import { Test } from '../../models/Test.js';
import { Topic } from '../../models/Topic.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { escapeRegex, sendPage } from '../../utils/http.js';
import { applyEditPolicy, materialSnapshot } from '../content/content.service.js';
import { REVIEWED_SOURCES } from './questionRules.js';
import { toAdminQuestion, toStudentQuestion } from './questionSerializer.js';

function buildFilter({ subjectId, topicId, type, difficulty, source, status, verificationStatus, tag, batchId, year, q }) {
  const f = {};
  if (subjectId) f.subjectId = subjectId;
  if (topicId) f.topicId = topicId;
  if (type) f.type = type;
  if (difficulty) f.difficulty = difficulty;
  if (source) f.source = source;
  if (status) f.status = status;
  if (verificationStatus) f.verificationStatus = verificationStatus;
  if (tag) f.conceptTags = tag.toLowerCase();
  if (batchId) f['aiMeta.batchId'] = batchId;
  if (year) f['pyq.year'] = year;
  if (q) f.statement = { $regex: escapeRegex(q), $options: 'i' };
  return f;
}

async function assertTopicInSubject(subjectId, topicId) {
  if (!(await Topic.exists({ _id: topicId, subjectId }))) {
    throw new ApiError(400, 'TAXONOMY_MISMATCH', 'The topic does not exist or does not belong to the subject.');
  }
}

// ---------------- student (published + public only, no answer key) ----------------
const STUDENT_BASE = { status: 'published', visibility: 'public' };

export const listForStudents = asyncHandler(async (req, res) => {
  const { page, limit, ...rest } = req.query;
  const filter = { ...buildFilter(rest), ...STUDENT_BASE };
  const [items, total] = await Promise.all([
    Question.find(filter).sort({ 'pyq.year': -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Question.countDocuments(filter),
  ]);
  sendPage(res, items.map(toStudentQuestion), { page, limit, total });
});

export const getForStudent = asyncHandler(async (req, res) => {
  const question = await Question.findOne({ _id: req.params.id, ...STUDENT_BASE });
  if (!question) throw new ApiError(404, 'QUESTION_NOT_FOUND', 'Question not found.');
  res.json({ success: true, data: toStudentQuestion(question) });
});

// ---------------- admin ----------------
export const listForAdmin = asyncHandler(async (req, res) => {
  const { page, limit, ...rest } = req.query;
  const filter = buildFilter(rest);
  const [items, total] = await Promise.all([
    Question.find(filter).select(ADMIN_FULL_SELECT).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Question.countDocuments(filter),
  ]);
  sendPage(res, items.map(toAdminQuestion), { page, limit, total });
});

export const getForAdmin = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id).select(ADMIN_FULL_SELECT);
  if (!question) throw new ApiError(404, 'QUESTION_NOT_FOUND', 'Question not found.');
  res.json({ success: true, data: toAdminQuestion(question) });
});

export const createQuestion = asyncHandler(async (req, res) => {
  await assertTopicInSubject(req.body.subjectId, req.body.topicId);
  // Reviewed content starts in review; it can never be created already published (the model enforces it too).
  const reviewed = REVIEWED_SOURCES.includes(req.body.source);
  const question = await Question.create({
    ...req.body,
    ...(reviewed && { verificationStatus: req.body.verificationStatus ?? 'draft' }),
    createdBy: req.user.id,
  });
  res.status(201).json({ success: true, data: toAdminQuestion(question) });
});

export const updateQuestion = asyncHandler(async (req, res) => {
  // The answer-key fields must be loaded, otherwise validation would see an empty key.
  const question = await Question.findById(req.params.id).select(ADMIN_FULL_SELECT);
  if (!question) throw new ApiError(404, 'QUESTION_NOT_FOUND', 'Question not found.');

  const subjectId = req.body.subjectId ?? String(question.subjectId);
  const topicId = req.body.topicId ?? String(question.topicId);
  if (req.body.subjectId || req.body.topicId) await assertTopicInSubject(subjectId, topicId);

  const before = materialSnapshot(question);
  question.set(req.body);
  // Editing the substance of a verified question withdraws the verification and unpublishes it.
  const reverificationRequired = applyEditPolicy(question, before);
  await question.save(); // model pre-validate enforces all question rules on the merged result
  res.json({ success: true, data: { ...toAdminQuestion(question), reverificationRequired } });
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  const usedBy = await Test.find({ 'sections.questionIds': req.params.id }).select('title').limit(5);
  if (usedBy.length) {
    throw new ApiError(409, 'QUESTION_IN_USE', `Question is used in: ${usedBy.map((t) => t.title).join(', ')}. Remove it from those tests first.`);
  }
  const deleted = await Question.findByIdAndDelete(req.params.id);
  if (!deleted) throw new ApiError(404, 'QUESTION_NOT_FOUND', 'Question not found.');
  res.json({ success: true, data: { deleted: true } });
});

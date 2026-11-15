import { Question } from '../../models/Question.js';
import { Subject } from '../../models/Subject.js';
import { Topic } from '../../models/Topic.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { slugify } from '../../utils/http.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

// ---------- read (any visitor) ----------
export const listSubjects = asyncHandler(async (_req, res) => {
  ok(res, await Subject.find().sort({ order: 1, name: 1 }));
});

export const listTopicsOfSubject = asyncHandler(async (req, res) => {
  ok(res, await Topic.find({ subjectId: req.params.id }).sort({ name: 1 }));
});

// ---------- admin: subjects ----------
export const createSubject = asyncHandler(async (req, res) => {
  const { name, slug, order } = req.body;
  const subject = await Subject.create({ name, slug: slug ?? slugify(name), order: order ?? (await Subject.countDocuments()) + 1 });
  ok(res, subject, 201);
});

export const updateSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id);
  if (!subject) throw new ApiError(404, 'SUBJECT_NOT_FOUND', 'Subject not found.');
  subject.set(req.body);
  await subject.save();
  ok(res, subject);
});

export const deleteSubject = asyncHandler(async (req, res) => {
  const [topics, questions] = await Promise.all([
    Topic.countDocuments({ subjectId: req.params.id }),
    Question.countDocuments({ subjectId: req.params.id }),
  ]);
  if (topics || questions) {
    throw new ApiError(409, 'SUBJECT_IN_USE', `Subject still has ${topics} topic(s) and ${questions} question(s). Remove them first.`);
  }
  const deleted = await Subject.findByIdAndDelete(req.params.id);
  if (!deleted) throw new ApiError(404, 'SUBJECT_NOT_FOUND', 'Subject not found.');
  ok(res, { deleted: true });
});

// ---------- admin: topics ----------
export const listTopics = asyncHandler(async (req, res) => {
  const filter = req.query.subjectId ? { subjectId: req.query.subjectId } : {};
  ok(res, await Topic.find(filter).sort({ subjectId: 1, name: 1 }));
});

export const createTopic = asyncHandler(async (req, res) => {
  const { subjectId, name, slug } = req.body;
  if (!(await Subject.exists({ _id: subjectId }))) throw new ApiError(400, 'SUBJECT_NOT_FOUND', 'Subject does not exist.');
  ok(res, await Topic.create({ subjectId, name, slug: slug ?? slugify(name) }), 201);
});

export const updateTopic = asyncHandler(async (req, res) => {
  const topic = await Topic.findById(req.params.id);
  if (!topic) throw new ApiError(404, 'TOPIC_NOT_FOUND', 'Topic not found.');
  topic.set(req.body);
  await topic.save();
  ok(res, topic);
});

export const deleteTopic = asyncHandler(async (req, res) => {
  const questions = await Question.countDocuments({ topicId: req.params.id });
  if (questions) throw new ApiError(409, 'TOPIC_IN_USE', `Topic still has ${questions} question(s). Move or delete them first.`);
  const deleted = await Topic.findByIdAndDelete(req.params.id);
  if (!deleted) throw new ApiError(404, 'TOPIC_NOT_FOUND', 'Topic not found.');
  ok(res, { deleted: true });
});

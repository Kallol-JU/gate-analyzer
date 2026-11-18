import { ADMIN_FULL_SELECT, Question } from '../../models/Question.js';
import { GenerationBatch } from '../../models/GenerationBatch.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendPage } from '../../utils/http.js';
import { aiStatus, expireStaleBatches, startGeneration, usedToday } from '../ai/generation.service.js';
import { toAdminQuestion } from '../questions/questionSerializer.js';
import * as svc from './content.service.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

// ---------------- review workflow ----------------
export const verify = asyncHandler(async (req, res) => ok(res, toAdminQuestion(await svc.verifyQuestion(req.user._id, req.params.id, req.body))));
export const publish = asyncHandler(async (req, res) => ok(res, toAdminQuestion(await svc.publishQuestion(req.params.id))));
export const unpublish = asyncHandler(async (req, res) => ok(res, toAdminQuestion(await svc.unpublishQuestion(req.params.id))));
export const reject = asyncHandler(async (req, res) => ok(res, toAdminQuestion(await svc.rejectQuestion(req.user._id, req.params.id, req.body.reason))));
export const revalidate = asyncHandler(async (req, res) => {
  const { question, result } = await svc.revalidateQuestion(req.params.id);
  ok(res, { question: toAdminQuestion(question), blocking: result.blocking });
});

export const bulk = asyncHandler(async (req, res) => {
  const { action, ids, reason, acknowledgeAiDisagreement } = req.body;
  if (action === 'reject' && !reason) throw new ApiError(400, 'VALIDATION_ERROR', 'A reason is required to reject.', [{ path: 'reason', message: 'Required.' }]);
  const results = await svc.bulkAction(req.user._id, action, ids, { reason, acknowledgeAiDisagreement });
  ok(res, { action, succeeded: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results });
});

export const importJson = asyncHandler(async (req, res) => ok(res, await svc.importQuestions(req.user._id, req.body)));

/** A single question with everything an admin needs (key, solution, validation report). */
export const detail = asyncHandler(async (req, res) => {
  const q = await Question.findById(req.params.id).select(ADMIN_FULL_SELECT);
  if (!q) throw new ApiError(404, 'QUESTION_NOT_FOUND', 'Question not found.');
  ok(res, toAdminQuestion(q));
});

// ---------------- AI generation ----------------
export const status = asyncHandler(async (req, res) => ok(res, { ...aiStatus(), usedToday: await usedToday(req.user._id) }));

export const generate = asyncHandler(async (req, res) => {
  const batch = await startGeneration(req.user, req.body);
  ok(res, batch, 202); // accepted: poll GET /admin/ai/batches/:id for progress
});

export const listBatches = asyncHandler(async (req, res) => {
  await expireStaleBatches();
  const { page, limit } = req.query;
  const [items, total] = await Promise.all([
    GenerationBatch.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('createdBy', 'name email'),
    GenerationBatch.countDocuments(),
  ]);
  sendPage(res, items, { page, limit, total });
});

export const getBatch = asyncHandler(async (req, res) => {
  await expireStaleBatches();
  const batch = await GenerationBatch.findById(req.params.id).populate('createdBy', 'name email');
  if (!batch) throw new ApiError(404, 'BATCH_NOT_FOUND', 'Generation batch not found.');
  ok(res, batch);
});

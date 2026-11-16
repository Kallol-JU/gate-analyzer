import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendPage } from '../../utils/http.js';
import * as svc from './attempt.service.js';
import { toExamView, toResultView, toSummary, timing } from './attemptSerializer.js';
import { ApiError } from '../../utils/ApiError.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

export const start = asyncHandler(async (req, res) => {
  const { attempt, resumed } = await svc.startTestAttempt(req.user.id, req.body.testId);
  ok(res, { resumed, attempt: toSummary(attempt) }, resumed ? 200 : 201);
});

export const startPractice = asyncHandler(async (req, res) => {
  const { attempt } = await svc.startCustomPractice(req.user.id, req.body);
  ok(res, { resumed: false, attempt: toSummary(attempt) }, 201);
});

export const active = asyncHandler(async (req, res) => {
  ok(res, (await svc.listActive(req.user.id)).map((a) => toSummary(a)));
});

export const history = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  const { items, total } = await svc.listHistory(req.user.id, { page, limit, status });
  sendPage(res, items.map((a) => toSummary(a)), { page, limit, total });
});

/** In progress: the exam view (no answer key). Closed: a summary, so the client can go to the result. */
export const getAttempt = asyncHandler(async (req, res) => {
  const a = await svc.getOwnedAttempt(req.user.id, req.params.id);
  ok(res, a.status === 'in_progress' ? toExamView(a) : toSummary(a));
});

export const getStatus = asyncHandler(async (req, res) => {
  const a = await svc.getOwnedAttempt(req.user.id, req.params.id);
  ok(res, { status: a.status, timing: timing(a, Date.now()) });
});

export const save = asyncHandler(async (req, res) => {
  const { applied, stale, attempt } = await svc.saveResponses(req.user.id, req.params.id, req.body.updates);
  ok(res, { applied, stale, status: attempt.status, timing: timing(attempt, Date.now()) });
});

export const submit = asyncHandler(async (req, res) => {
  const a = await svc.submitAttempt(req.user.id, req.params.id);
  ok(res, toSummary(a));
});

/** Answers and explanations are released here, and only for attempts that are no longer in progress. */
export const result = asyncHandler(async (req, res) => {
  const a = await svc.getOwnedAttempt(req.user.id, req.params.id, { withKey: true });
  if (a.status === 'in_progress') throw new ApiError(409, 'NOT_SUBMITTED', 'Results are available after you submit the exam.');
  ok(res, toResultView(a));
});

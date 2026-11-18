import { asyncHandler } from '../../utils/asyncHandler.js';
import { TestAttempt } from '../../models/TestAttempt.js';
import { buildDashboardAnalytics } from './dashboardAnalytics.js';

export const analytics = asyncHandler(async (req, res) => {
  const attempts = await TestAttempt.find({ userId: req.user.id })
    .select('kind status startedAt expiresAt timeTakenSec testSnapshot.title result questions.subjectName questions.topicName')
    .sort({ startedAt: 1 })
    .lean();

  res.json({ success: true, data: buildDashboardAnalytics(attempts) });
});

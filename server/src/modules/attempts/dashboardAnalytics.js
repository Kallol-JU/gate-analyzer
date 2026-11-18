/** Build dashboard metrics only from this user's completed attempt snapshots. */
export function buildDashboardAnalytics(attempts) {
  const completed = attempts.filter((a) => a.status !== 'in_progress' && a.result);
  const active = attempts.filter((a) => a.status === 'in_progress');

  const scorePercentages = completed
    .filter((a) => Number(a.result?.totalMarks) > 0)
    .map((a) => (Number(a.result.score) / Number(a.result.totalMarks)) * 100);
  const averageScore = scorePercentages.length
    ? scorePercentages.reduce((sum, value) => sum + value, 0) / scorePercentages.length
    : null;

  const correct = completed.reduce((sum, a) => sum + Number(a.result?.correct || 0), 0);
  const attempted = completed.reduce((sum, a) => sum + Number(a.result?.attempted || 0), 0);
  const durations = completed.map((a) => Number(a.timeTakenSec)).filter(Number.isFinite);
  const averageTime = durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : null;

  const subjects = new Map();
  const topics = new Map();
  for (const attempt of completed) {
    for (const item of attempt.result?.subjectBreakdown || []) {
      const key = String(item.subjectId || item.subjectName);
      const current = subjects.get(key) || { subject: item.subjectName || 'Subject', correct: 0, incorrect: 0 };
      current.correct += Number(item.correct || 0);
      current.incorrect += Number(item.incorrect || 0);
      subjects.set(key, current);
    }

    const questions = attempt.questions || [];
    const outcomes = attempt.result?.perQuestion || [];
    questions.forEach((question, index) => {
      const outcome = outcomes[index]?.outcome;
      if (!question.topicName || !['correct', 'incorrect'].includes(outcome)) return;
      const key = `${question.subjectName || ''}::${question.topicName}`;
      const current = topics.get(key) || {
        topic: question.topicName,
        subject: question.subjectName || 'Subject',
        correct: 0,
        incorrect: 0,
      };
      current[outcome] += 1;
      topics.set(key, current);
    });
  }

  const subjectAccuracy = [...subjects.values()]
    .filter((item) => item.correct + item.incorrect > 0)
    .map((item) => ({ subject: item.subject, accuracy: Math.round((item.correct / (item.correct + item.incorrect)) * 100) }))
    .sort((a, b) => a.subject.localeCompare(b.subject));

  const weakTopics = [...topics.values()]
    .map((item) => ({
      topic: item.topic,
      subject: item.subject,
      accuracy: Math.round((item.correct / (item.correct + item.incorrect)) * 100),
      attempted: item.correct + item.incorrect,
    }))
    .sort((a, b) => a.accuracy - b.accuracy || b.attempted - a.attempted)
    .slice(0, 5);

  const mockAttempts = completed.filter((a) => a.kind === 'mock');
  const trendSource = mockAttempts.length ? mockAttempts : completed;
  const scoreTrend = trendSource
    .slice(-8)
    .map((a, index) => ({
      label: a.kind === 'mock' ? `Mock ${index + 1}` : `Test ${index + 1}`,
      score: Number(a.result.totalMarks) > 0 ? Math.round((Number(a.result.score) / Number(a.result.totalMarks)) * 1000) / 10 : 0,
      totalMarks: 100,
    }));

  const recentAttempts = [...attempts].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt)).slice(0, 5).map((a) => ({
    id: String(a._id),
    title: a.testSnapshot?.title || 'Untitled test',
    kind: a.kind,
    status: a.status,
    startedAt: a.startedAt,
    timeTakenSec: a.timeTakenSec,
    remainingSeconds: a.status === 'in_progress' ? Math.max(0, Math.ceil((new Date(a.expiresAt) - Date.now()) / 1000)) : 0,
    result: a.result ? {
      score: a.result.score,
      totalMarks: a.result.totalMarks,
      accuracy: a.result.accuracy,
    } : null,
  }));

  const activeAttempts = active.map((a) => ({
    id: String(a._id),
    title: a.testSnapshot?.title || 'Untitled test',
    remainingSeconds: Math.max(0, Math.ceil((new Date(a.expiresAt) - Date.now()) / 1000)),
  }));

  return {
    stats: {
      completed: completed.length,
      averageScore: averageScore == null ? null : Math.round(averageScore * 10) / 10,
      accuracy: attempted ? Math.round((correct / attempted) * 100) : null,
      averageTimeSec: averageTime == null ? null : Math.round(averageTime),
    },
    scoreTrend,
    subjectAccuracy,
    weakTopics,
    recentAttempts,
    activeAttempts,
  };
}

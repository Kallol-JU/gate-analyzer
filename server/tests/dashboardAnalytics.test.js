import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboardAnalytics } from '../src/modules/attempts/dashboardAnalytics.js';

test('dashboard analytics uses completed attempt data and ignores unanswered questions for accuracy', () => {
  const data = buildDashboardAnalytics([
    {
      _id: 'a1', kind: 'mock', status: 'submitted', startedAt: '2026-11-01T10:00:00Z', timeTakenSec: 3600,
      testSnapshot: { title: 'Mock 1' },
      result: {
        score: 60, totalMarks: 100, correct: 6, incorrect: 2, unanswered: 2, attempted: 8, accuracy: 75,
        subjectBreakdown: [{ subjectId: 's1', subjectName: 'Algorithms', correct: 3, incorrect: 1 }],
        perQuestion: [{ outcome: 'correct' }, { outcome: 'incorrect' }],
      },
      questions: [
        { subjectName: 'Algorithms', topicName: 'Sorting' },
        { subjectName: 'Algorithms', topicName: 'Sorting' },
      ],
    },
    {
      _id: 'a2', kind: 'topic', status: 'in_progress', startedAt: '2026-11-02T10:00:00Z', expiresAt: '2026-11-02T11:00:00Z',
      testSnapshot: { title: 'Sorting practice' },
    },
  ]);

  assert.equal(data.stats.completed, 1);
  assert.equal(data.stats.averageScore, 60);
  assert.equal(data.stats.accuracy, 75);
  assert.equal(data.stats.averageTimeSec, 3600);
  assert.deepEqual(data.subjectAccuracy, [{ subject: 'Algorithms', accuracy: 75 }]);
  assert.deepEqual(data.weakTopics, [{ topic: 'Sorting', subject: 'Algorithms', accuracy: 50, attempted: 2 }]);
  assert.equal(data.recentAttempts.length, 2);
  assert.equal(data.activeAttempts.length, 1);
});

test('dashboard analytics returns empty metrics when a user has no attempts', () => {
  const data = buildDashboardAnalytics([]);
  assert.deepEqual(data.stats, { completed: 0, averageScore: null, accuracy: null, averageTimeSec: null });
  assert.deepEqual(data.scoreTrend, []);
  assert.deepEqual(data.subjectAccuracy, []);
  assert.deepEqual(data.weakTopics, []);
  assert.deepEqual(data.recentAttempts, []);
  assert.deepEqual(data.activeAttempts, []);
});

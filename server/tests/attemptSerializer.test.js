import test from 'node:test';
import assert from 'node:assert/strict';
import { toExamView, toResultView, toSummary } from '../src/modules/attempts/attemptSerializer.js';

const attempt = (over = {}) => ({
  _id: 'a1', userId: 'u1', testId: 't1', kind: 'mock', mode: 'competitive', status: 'in_progress',
  startedAt: new Date('2026-01-01T09:00:00Z'), expiresAt: new Date('2026-01-01T12:00:00Z'),
  testSnapshot: { title: 'Mock 1', kind: 'mock', mode: 'competitive', durationMinutes: 180, totalQuestions: 1, totalMarks: 2, marking: { negativeMarkingEnabled: true, mcqNegativeFraction: 1 / 3 }, sections: [{ name: 'S', startIndex: 0, count: 1 }] },
  questions: [{ qid: 'q1', type: 'MCQ', statement: 'S?', options: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }], marks: 2, negativeMarks: 0.6667, sectionIndex: 0, subjectName: 'SECRET-SUBJECT', topicName: 'SECRET-TOPIC' }],
  answerKey: [{ correctOptions: ['B'], explanation: 'SECRET-EXPLANATION' }],
  responses: [{ answer: 'A', visited: true, marked: false, seq: 3 }],
  version: 2,
  ...over,
});
const FORBIDDEN = ['correctOptions', 'natAnswer', 'SECRET-EXPLANATION', 'explanation', 'answerKey', 'SECRET-SUBJECT', 'SECRET-TOPIC', 'userId'];

test('exam view (in progress) never contains the answer key, explanation or internals', () => {
  const view = toExamView(attempt(), new Date('2026-01-01T11:00:00Z').getTime());
  const json = JSON.stringify(view);
  for (const f of FORBIDDEN) assert.ok(!json.includes(f), `exam view leaked ${f}`);
  assert.equal(view.timing.remainingSeconds, 3600);
  assert.equal(view.timing.serverNow, '2026-01-01T11:00:00.000Z');
  assert.deepEqual(view.responses[0], { answer: 'A', visited: true, marked: false, seq: 3 });
});

test('summary lists have no questions, responses or answers, and hide the result until closed', () => {
  const open = JSON.stringify(toSummary(attempt()));
  for (const f of [...FORBIDDEN, 'responses', 'statement']) assert.ok(!open.includes(f), `summary leaked ${f}`);
  assert.equal(toSummary(attempt()).result, undefined);

  const closed = toSummary(attempt({ status: 'submitted', result: { score: 2, totalMarks: 2, correct: 1, incorrect: 0, unanswered: 0, accuracy: 100 }, timeTakenSec: 60 }));
  assert.equal(closed.result.score, 2);
  assert.equal(closed.remainingSeconds, 0);
});

test('result view includes the review with key and explanation', () => {
  const view = toResultView(attempt({
    status: 'auto_submitted',
    result: { score: 0, totalMarks: 2, correct: 0, incorrect: 1, unanswered: 0, attempted: 1, accuracy: 0, subjectBreakdown: [], perQuestion: [{ outcome: 'incorrect', marksAwarded: -0.6667 }] },
  }));
  assert.equal(view.autoSubmitted, true);
  assert.deepEqual(view.review[0].correctOptions, ['B']);
  assert.equal(view.review[0].explanation, 'SECRET-EXPLANATION');
  assert.equal(view.review[0].yourAnswer, 'A');
  assert.equal(view.review[0].outcome, 'incorrect');
});

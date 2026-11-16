import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAttemptContent, evaluateAttempt, GRACE_MS, gradeQuestion, hasAnswer, isExpired, isPastGrace, normalizeAnswer, remainingMs,
} from '../src/modules/attempts/attemptRules.js';

const opts = ['A', 'B', 'C', 'D'].map((key) => ({ key, text: key }));
const mcq = { type: 'MCQ', marks: 2, negativeMarks: 2 / 3, options: opts };
const msq = { type: 'MSQ', marks: 2, negativeMarks: 0, options: opts };
const nat = { type: 'NAT', marks: 1, negativeMarks: 0 };

test('normalizeAnswer validates by question type and option keys', () => {
  assert.deepEqual(normalizeAnswer(mcq, 'B'), { ok: true, value: 'B' });
  assert.equal(normalizeAnswer(mcq, 'Z').ok, false);
  assert.equal(normalizeAnswer(mcq, ['A']).ok, false);
  assert.deepEqual(normalizeAnswer(mcq, null), { ok: true, value: null });
  assert.deepEqual(normalizeAnswer(msq, ['C', 'A']), { ok: true, value: ['A', 'C'] });
  assert.equal(normalizeAnswer(msq, ['A', 'A']).ok, false);
  assert.equal(normalizeAnswer(msq, ['E']).ok, false);
  assert.equal(normalizeAnswer(msq, 'A').ok, false);
  assert.deepEqual(normalizeAnswer(msq, []), { ok: true, value: null });
  assert.deepEqual(normalizeAnswer(nat, ' -12.5 '), { ok: true, value: '-12.5' });
  assert.deepEqual(normalizeAnswer(nat, ''), { ok: true, value: null });
  for (const bad of ['abc', '1e5', '1.2.3', '--1', '12345678901234567', ['1']]) assert.equal(normalizeAnswer(nat, bad).ok, false, String(bad));
});

test('hasAnswer ignores partial NAT input', () => {
  for (const v of [null, undefined, '', '-', '.', '-.', [], '  ']) assert.equal(hasAnswer(v), false, String(v));
  for (const v of ['0', 'A', ['A'], '-1.5']) assert.equal(hasAnswer(v), true);
});

test('MCQ: correct, incorrect with negative marking, unanswered', () => {
  const key = { correctOptions: ['B'] };
  assert.deepEqual(gradeQuestion(mcq, key, 'B'), { outcome: 'correct', marksAwarded: 2 });
  assert.deepEqual(gradeQuestion(mcq, key, 'A'), { outcome: 'incorrect', marksAwarded: -(2 / 3) });
  assert.deepEqual(gradeQuestion(mcq, key, null), { outcome: 'unanswered', marksAwarded: 0 });
});

test('MSQ: exact set only, no partial credit, no negative marking', () => {
  const key = { correctOptions: ['A', 'C'] };
  assert.equal(gradeQuestion(msq, key, ['A', 'C']).outcome, 'correct');
  assert.equal(gradeQuestion(msq, key, ['C', 'A']).outcome, 'correct'); // order irrelevant
  assert.deepEqual(gradeQuestion(msq, key, ['A']), { outcome: 'incorrect', marksAwarded: 0 }); // subset
  assert.deepEqual(gradeQuestion(msq, key, ['A', 'B', 'C']), { outcome: 'incorrect', marksAwarded: 0 }); // superset
  assert.deepEqual(gradeQuestion(msq, key, ['B', 'D']), { outcome: 'incorrect', marksAwarded: 0 });
  assert.equal(gradeQuestion(msq, key, []).outcome, 'unanswered');
  // Even if a question carries a negative value, MSQ never loses marks.
  assert.equal(gradeQuestion({ ...msq, negativeMarks: 1 }, key, ['B']).marksAwarded, 0);
});

test('NAT: inclusive tolerance range, no negative marking, partial input unanswered', () => {
  const key = { natAnswer: { min: 4.45, max: 4.55 } };
  for (const ok of ['4.45', '4.5', '4.55', '4.50']) assert.equal(gradeQuestion(nat, key, ok).outcome, 'correct', ok);
  for (const bad of ['4.44', '4.56', '-4.5', '0']) assert.deepEqual(gradeQuestion(nat, key, bad), { outcome: 'incorrect', marksAwarded: 0 });
  assert.equal(gradeQuestion(nat, key, '-').outcome, 'unanswered');
  assert.equal(gradeQuestion(nat, { natAnswer: { min: -3, max: -3 } }, '-3').outcome, 'correct');
  assert.equal(gradeQuestion(nat, { natAnswer: { min: 0.1 + 0.2, max: 0.1 + 0.2 } }, '0.3').outcome, 'correct'); // float noise
});

test('evaluateAttempt totals, accuracy and subject breakdown', () => {
  const sA = 'subjA', sB = 'subjB';
  const questions = [
    { ...mcq, subjectId: sA, subjectName: 'Algorithms' },
    { ...mcq, marks: 1, negativeMarks: 1 / 3, subjectId: sA, subjectName: 'Algorithms' },
    { ...msq, subjectId: sB, subjectName: 'Databases' },
    { ...nat, subjectId: sB, subjectName: 'Databases' },
    { ...nat, subjectId: sB, subjectName: 'Databases' },
  ];
  const answerKey = [{ correctOptions: ['B'] }, { correctOptions: ['A'] }, { correctOptions: ['A', 'C'] }, { natAnswer: { min: 4, max: 4 } }, { natAnswer: { min: 1, max: 1 } }];
  const responses = [{ answer: 'B' }, { answer: 'C' }, { answer: ['A', 'C'] }, { answer: '4' }, { answer: null }];
  const r = evaluateAttempt({ questions, answerKey, responses });

  assert.equal(r.score, 4.67); // 2 - 1/3 + 2 + 1
  assert.equal(r.totalMarks, 7);
  assert.deepEqual([r.correct, r.incorrect, r.unanswered, r.attempted], [3, 1, 1, 4]);
  assert.equal(r.accuracy, 75);
  assert.deepEqual(r.perQuestion.map((p) => p.outcome), ['correct', 'incorrect', 'correct', 'correct', 'unanswered']);
  const algo = r.subjectBreakdown.find((s) => s.subjectName === 'Algorithms');
  assert.deepEqual([algo.correct, algo.incorrect, algo.marksObtained, algo.maxMarks, algo.accuracy], [1, 1, 1.67, 3, 50]);
  const db = r.subjectBreakdown.find((s) => s.subjectName === 'Databases');
  assert.deepEqual([db.correct, db.unanswered, db.marksObtained, db.maxMarks], [2, 1, 3, 4]);
});

test('all unanswered scores zero with 0 accuracy; score can go negative', () => {
  const q = [{ ...mcq, subjectId: 's', subjectName: 'S' }];
  const k = [{ correctOptions: ['A'] }];
  const blank = evaluateAttempt({ questions: q, answerKey: k, responses: [{ answer: null }] });
  assert.deepEqual([blank.score, blank.accuracy, blank.unanswered], [0, 0, 1]);
  const wrong = evaluateAttempt({ questions: q, answerKey: k, responses: [{ answer: 'D' }] });
  assert.equal(wrong.score, -0.67);
  assert.equal(wrong.accuracy, 0);
});

test('time helpers are derived from server timestamps only', () => {
  const exp = new Date('2026-01-01T10:00:00Z');
  const t = exp.getTime();
  assert.equal(remainingMs(exp, t - 90_000), 90_000);
  assert.equal(remainingMs(exp, t + 10), 0);
  assert.equal(isExpired(exp, t - 1), false);
  assert.equal(isExpired(exp, t), true);
  assert.equal(isPastGrace(exp, t + GRACE_MS), false);
  assert.equal(isPastGrace(exp, t + GRACE_MS + 1), true);
});

test('snapshot freezes content, marks and effective negative marking', () => {
  const live = {
    _id: 'q1', type: 'MCQ', statement: 'S', marks: 2, negativeMarks: 1, subjectId: 's1', topicId: 't1',
    options: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }], correctOptions: ['A'], explanation: 'why',
  };
  const natQ = { _id: 'q2', type: 'NAT', statement: 'N', marks: 1, negativeMarks: 0, subjectId: 's1', topicId: 't1', natAnswer: { min: 1, max: 2 } };
  const questions = new Map([['q1', live], ['q2', natQ]]);
  const base = { title: 'T', kind: 'mock', mode: 'competitive', durationMinutes: 180, sections: [{ name: 'S1', questionIds: ['q1'] }, { name: 'S2', questionIds: ['q2'] }] };
  const names = { subjectNames: new Map([['s1', 'Algo']]), topicNames: new Map([['t1', 'Sorting']]) };

  const c = buildAttemptContent({ test: { ...base, marking: { negativeMarkingEnabled: true, mcqNegativeFraction: 1 / 3 } }, questions, ...names });
  assert.equal(c.questions[0].negativeMarks, 0.6667); // test fraction wins over the question's own value
  assert.equal(c.questions[1].negativeMarks, 0);
  assert.deepEqual(c.testSnapshot.sections, [{ name: 'S1', startIndex: 0, count: 1 }, { name: 'S2', startIndex: 1, count: 1 }]);
  assert.equal(c.testSnapshot.totalMarks, 3);
  assert.deepEqual(c.responses.map((r) => r.visited), [true, false]);
  assert.deepEqual(c.answerKey[0].correctOptions, ['A']);
  assert.equal(c.questions[0].subjectName, 'Algo');

  // Editing the live question afterwards cannot change the snapshot.
  live.statement = 'CHANGED'; live.marks = 99; live.options[0].text = 'CHANGED'; live.correctOptions = ['B'];
  assert.equal(c.questions[0].statement, 'S');
  assert.equal(c.questions[0].marks, 2);
  assert.equal(c.questions[0].options[0].text, 'a');

  const off = buildAttemptContent({ test: { ...base, marking: { negativeMarkingEnabled: false, mcqNegativeFraction: 1 / 3 } }, questions, ...names });
  assert.equal(off.questions[0].negativeMarks, 0);
  const perQ = buildAttemptContent({ test: { ...base, marking: { negativeMarkingEnabled: true, mcqNegativeFraction: 1 / 3, useQuestionNegativeMarks: true } }, questions, ...names });
  assert.equal(perQ.questions[0].negativeMarks, 1); // per-question configuration honoured
});

test('snapshot fails loudly when a question is missing', () => {
  assert.throws(
    () => buildAttemptContent({ test: { title: 'T', kind: 'mock', mode: 'practice', durationMinutes: 10, sections: [{ name: 'S', questionIds: ['gone'] }] }, questions: new Map(), subjectNames: new Map(), topicNames: new Map() }),
    /MISSING_QUESTION:gone/,
  );
});

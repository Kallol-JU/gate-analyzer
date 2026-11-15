import test from 'node:test';
import assert from 'node:assert/strict';
import { toAdminQuestion, toStudentQuestion } from '../src/modules/questions/questionSerializer.js';
import { toStudentTest } from '../src/modules/tests/testSerializer.js';

const raw = {
  _id: 'q1', type: 'MSQ', statement: 'S', code: 'int x;', marks: 2, negativeMarks: 0,
  options: [{ key: 'A', text: 'a', secret: 'x' }, { key: 'B', text: 'b' }],
  correctOptions: ['A'], natAnswer: { min: 1, max: 2 }, explanation: 'because',
  subjectId: 's1', topicId: 't1', difficulty: 'hard', source: 'PYQ', pyq: { year: 2024, session: 'Set 1' },
  status: 'published', visibility: 'public', ownerId: 'u9', createdBy: 'u1', aiMeta: { model: 'm' },
};

test('student question view never contains the answer key or internal fields', () => {
  const v = toStudentQuestion(raw);
  const json = JSON.stringify(v);
  for (const forbidden of ['correctOptions', 'natAnswer', 'explanation', 'because', 'secret', 'aiMeta', 'createdBy', 'ownerId', 'status']) {
    assert.ok(!json.includes(forbidden), `student view leaked "${forbidden}"`);
  }
  assert.equal(v.id, 'q1');
  assert.deepEqual(v.options, [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }]);
  assert.deepEqual(v.pyq, { year: 2024, session: 'Set 1' });
});

test('student view omits pyq metadata for non-PYQ questions', () => {
  assert.equal(toStudentQuestion({ ...raw, source: 'AI', pyq: undefined }).pyq, undefined);
});

test('admin view includes the answer key', () => {
  const v = toAdminQuestion(raw);
  assert.deepEqual(v.correctOptions, ['A']);
  assert.deepEqual(v.natAnswer, { min: 1, max: 2 });
  assert.equal(v.explanation, 'because');
});

test('student test view has section counts but no question ids', () => {
  const v = toStudentTest({
    _id: 't1', title: 'T', kind: 'mock', mode: 'competitive', durationMinutes: 180, createdBy: 'u1',
    sections: [{ name: 'GA', questionIds: ['q1', 'q2'] }], totalQuestions: 2, totalMarks: 3,
  });
  assert.deepEqual(v.sections, [{ name: 'GA', questionCount: 2 }]);
  const json = JSON.stringify(v);
  assert.ok(!json.includes('q1') && !json.includes('createdBy'));
});

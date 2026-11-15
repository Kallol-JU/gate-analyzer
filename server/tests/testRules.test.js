import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDistribution, effectiveNegativeMarks, validatePublishable, validateTestConfig,
} from '../src/modules/tests/testRules.js';

const base = { kind: 'mock', mode: 'competitive', durationMinutes: 180, sections: [{ name: 'GA', questionIds: ['a', 'b'] }] };
const paths = (t) => validateTestConfig(t).map((e) => e.path);

test('valid mock test passes', () => assert.deepEqual(validateTestConfig(base), []));

test('duration must be a whole number of minutes in range', () => {
  assert.ok(paths({ ...base, durationMinutes: 0 }).includes('durationMinutes'));
  assert.ok(paths({ ...base, durationMinutes: 601 }).includes('durationMinutes'));
  assert.ok(paths({ ...base, durationMinutes: 90.5 }).includes('durationMinutes'));
});

test('section names must be unique and a question cannot repeat', () => {
  assert.ok(paths({ ...base, sections: [{ name: 'A', questionIds: ['a'] }, { name: 'a', questionIds: ['b'] }] }).includes('sections'));
  assert.ok(paths({ ...base, sections: [{ name: 'A', questionIds: ['a'] }, { name: 'B', questionIds: ['a'] }] }).includes('sections'));
});

test('AI practice tests are practice-only, blueprint-based and have no fixed questions', () => {
  const ai = { kind: 'ai_practice', mode: 'practice', durationMinutes: 60, sections: [], blueprint: { counts: { MCQ: 5, MSQ: 2, NAT: 3 } } };
  assert.deepEqual(validateTestConfig(ai), []);
  assert.ok(paths({ ...ai, mode: 'competitive' }).includes('mode'));
  assert.ok(paths({ ...ai, blueprint: undefined }).includes('blueprint'));
  assert.ok(paths({ ...ai, blueprint: { counts: { MCQ: 0, MSQ: 0, NAT: 0 } } }).includes('blueprint.counts'));
  assert.ok(paths({ ...ai, sections: [{ name: 'x', questionIds: ['a'] }] }).includes('sections'));
  assert.ok(paths({ ...base, blueprint: { counts: { MCQ: 1 } } }).includes('blueprint'));
});

test('subject-wise and topic-wise tests need a scope', () => {
  assert.ok(paths({ ...base, kind: 'subject' }).includes('scope.subjectId'));
  assert.deepEqual(validateTestConfig({ ...base, kind: 'subject', scope: { subjectId: 's1' } }), []);
  assert.ok(paths({ ...base, kind: 'topic', scope: { subjectId: 's1' } }).includes('scope'));
  assert.deepEqual(validateTestConfig({ ...base, kind: 'topic', scope: { subjectId: 's1', topicId: 't1' } }), []);
});

test('marking fraction must be within 0..1', () => {
  assert.ok(paths({ ...base, marking: { negativeMarkingEnabled: true, mcqNegativeFraction: 1.5 } }).includes('marking.mcqNegativeFraction'));
});

test('publishing requires existing, published, public questions', () => {
  const qs = [{ _id: 'a', status: 'published', visibility: 'public', source: 'PYQ' }, { _id: 'b', status: 'published', visibility: 'public', source: 'PYQ' }];
  assert.deepEqual(validatePublishable(base, qs), []);
  assert.equal(validatePublishable({ ...base, sections: [] }, qs).length, 1);
  assert.equal(validatePublishable(base, [qs[0]]).length, 1); // 'b' missing
  assert.equal(validatePublishable(base, [qs[0], { ...qs[1], status: 'draft' }]).length, 1);
  assert.equal(validatePublishable(base, [qs[0], { ...qs[1], visibility: 'private' }]).length, 1);
});

test('PYQ tests accept only PYQ questions; scoped tests only matching questions', () => {
  const q = (o) => ({ status: 'published', visibility: 'public', source: 'PYQ', subjectId: 's1', topicId: 't1', ...o });
  const t = { ...base, kind: 'pyq' };
  assert.equal(validatePublishable(t, [q({ _id: 'a' }), q({ _id: 'b', source: 'AI' })]).length, 1);
  const scoped = { ...base, kind: 'subject', scope: { subjectId: 's1' } };
  assert.equal(validatePublishable(scoped, [q({ _id: 'a' }), q({ _id: 'b', subjectId: 's2' })]).length, 1);
  const topic = { ...base, kind: 'topic', scope: { subjectId: 's1', topicId: 't1' } };
  assert.equal(validatePublishable(topic, [q({ _id: 'a' }), q({ _id: 'b', topicId: 't2' })]).length, 1);
});

test('distribution and totals', () => {
  const r = computeDistribution([
    { type: 'MCQ', marks: 1, subjectId: 's1' }, { type: 'MCQ', marks: 2, subjectId: 's1' },
    { type: 'NAT', marks: 2, subjectId: 's2' }, { type: 'MSQ', marks: 2, subjectId: 's2' },
  ]);
  assert.equal(r.totalQuestions, 4);
  assert.equal(r.totalMarks, 7);
  assert.deepEqual(r.distribution.byType, { MCQ: 2, MSQ: 1, NAT: 1 });
  assert.deepEqual(r.distribution.bySubject, [{ subjectId: 's1', count: 2 }, { subjectId: 's2', count: 2 }]);
});

test('effective negative marks come from the test marking configuration', () => {
  const on = { negativeMarkingEnabled: true, mcqNegativeFraction: 1 / 3 };
  assert.equal(effectiveNegativeMarks({ type: 'MCQ', marks: 1 }, on), 0.3333);
  assert.equal(effectiveNegativeMarks({ type: 'MCQ', marks: 2 }, on), 0.6667);
  assert.equal(effectiveNegativeMarks({ type: 'MSQ', marks: 2 }, on), 0);
  assert.equal(effectiveNegativeMarks({ type: 'NAT', marks: 2 }, on), 0);
  assert.equal(effectiveNegativeMarks({ type: 'MCQ', marks: 2 }, { ...on, negativeMarkingEnabled: false }), 0);
  assert.equal(effectiveNegativeMarks({ type: 'MCQ', marks: 2 }, { ...on, mcqNegativeFraction: 0.5 }), 1);
});

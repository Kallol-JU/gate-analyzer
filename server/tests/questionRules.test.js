import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultNegativeMarks, validateQuestionRules } from '../src/modules/questions/questionRules.js';

const opts = [{ key: 'A', text: 'one' }, { key: 'B', text: 'two' }, { key: 'C', text: 'three' }];
const mcq = { type: 'MCQ', options: opts, correctOptions: ['B'], marks: 1, source: 'ADMIN' };
const paths = (q) => validateQuestionRules(q).map((e) => e.path);

test('valid MCQ, MSQ and NAT pass', () => {
  assert.deepEqual(validateQuestionRules(mcq), []);
  assert.deepEqual(validateQuestionRules({ ...mcq, type: 'MSQ', correctOptions: ['A', 'C'], marks: 2 }), []);
  assert.deepEqual(validateQuestionRules({ type: 'NAT', natAnswer: { min: 4.5, max: 4.6 }, marks: 2, source: 'ADMIN' }), []);
});

test('MCQ needs exactly one correct option, MSQ at least one', () => {
  assert.ok(paths({ ...mcq, correctOptions: ['A', 'B'] }).includes('correctOptions'));
  assert.ok(paths({ ...mcq, correctOptions: [] }).includes('correctOptions'));
  assert.ok(paths({ ...mcq, type: 'MSQ', correctOptions: [] }).includes('correctOptions'));
});

test('correct options must exist among option keys and not repeat', () => {
  assert.ok(paths({ ...mcq, correctOptions: ['D'] }).includes('correctOptions'));
  assert.ok(paths({ ...mcq, type: 'MSQ', correctOptions: ['A', 'A'] }).includes('correctOptions'));
});

test('options: at least 2, unique keys, non-empty text', () => {
  assert.ok(paths({ ...mcq, options: [opts[0]], correctOptions: ['A'] }).includes('options'));
  assert.ok(paths({ ...mcq, options: [opts[0], opts[0]], correctOptions: ['A'] }).includes('options'));
  assert.ok(paths({ ...mcq, options: [opts[0], { key: 'B', text: '  ' }] }).includes('options'));
});

test('NAT needs a valid range and no options', () => {
  assert.ok(paths({ type: 'NAT', marks: 1, source: 'ADMIN' }).includes('natAnswer'));
  assert.ok(paths({ type: 'NAT', natAnswer: { min: 5, max: 4 }, marks: 1, source: 'ADMIN' }).includes('natAnswer'));
  assert.ok(paths({ type: 'NAT', natAnswer: { min: 1, max: 1 }, options: opts, marks: 1, source: 'ADMIN' }).includes('options'));
  assert.deepEqual(validateQuestionRules({ type: 'NAT', natAnswer: { min: 3, max: 3 }, marks: 1, source: 'ADMIN' }), []);
});

test('MCQ/MSQ must not carry a numeric answer', () => {
  assert.ok(paths({ ...mcq, natAnswer: { min: 1, max: 2 } }).includes('natAnswer'));
});

test('marks and negative marks', () => {
  assert.ok(paths({ ...mcq, marks: 0 }).includes('marks'));
  assert.ok(paths({ ...mcq, negativeMarks: 2 }).includes('negativeMarks'));
  assert.ok(paths({ ...mcq, negativeMarks: -1 }).includes('negativeMarks'));
  assert.deepEqual(validateQuestionRules({ ...mcq, negativeMarks: 1 / 3 }), []);
});

test('PYQ needs year and session; other sources must not have them', () => {
  assert.ok(paths({ ...mcq, source: 'PYQ' }).includes('pyq.year'));
  assert.ok(paths({ ...mcq, source: 'PYQ', pyq: { year: 2024, session: '' } }).includes('pyq.session'));
  assert.ok(paths({ ...mcq, source: 'PYQ', pyq: { year: 1900, session: 'Set 1' } }).includes('pyq.year'));
  assert.deepEqual(validateQuestionRules({ ...mcq, source: 'PYQ', pyq: { year: 2024, session: 'Set 1' } }), []);
  // An AI or admin question can never be labelled as a PYQ.
  assert.ok(paths({ ...mcq, source: 'AI', pyq: { year: 2024, session: 'Set 1' } }).includes('pyq'));
  assert.ok(paths({ ...mcq, source: 'ADMIN', pyq: { year: 2024, session: 'Set 1' } }).includes('pyq'));
});

test('unknown type is rejected', () => {
  assert.deepEqual(paths({ ...mcq, type: 'TRUEFALSE' }), ['type']);
});

test('default negative marks follow the GATE convention', () => {
  assert.equal(defaultNegativeMarks('MCQ', 1), 0.3333);
  assert.equal(defaultNegativeMarks('MCQ', 2), 0.6667);
  assert.equal(defaultNegativeMarks('MSQ', 2), 0);
  assert.equal(defaultNegativeMarks('NAT', 2), 0);
});

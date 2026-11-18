import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGenerationPrompt, buildVerificationPrompt, compareSolverAnswer, GENERATION_SCHEMA, normalizeGenerated, parseJsonText, PROMPT_VERSION,
} from '../src/modules/content/generatedQuestion.js';
import { GATE_FULL_MOCK, matchesFilters, mulberry32, resolveTemplate, selectQuestions } from '../src/modules/content/testBuilder.js';

const ctx = { style: 'ADVANCED', difficulty: 'hard', subjectId: 's1', topicId: 't1', model: 'gemini-test', batchId: 'b1' };
const rawMcq = () => ({
  type: 'MCQ', statement: 'Consider a binary min-heap holding the keys 3, 5, 9, 6, 8, 20, 10. What is the height of the heap after inserting 2?',
  options: [{ key: 'A', text: '1' }, { key: 'B', text: '2' }, { key: 'C', text: '3' }, { key: 'D', text: '4' }], correctOptions: ['C'],
  marks: 1, difficulty: 'hard', explanation: 'Seven keys fill a complete tree of height 2; the eighth key starts a new level, so the height becomes 3.',
  solutionSteps: ['Count the keys.', 'A complete tree with 7 nodes has height 2.', 'Insert the 8th key at the next level.'], conceptTags: ['heap', 'height'],
  estimatedTimeSeconds: 120, optionAnalysis: [{ key: 'C', analysis: 'Correct.' }],
});

test('generation schema forces structured output with the fields the validator needs', () => {
  const item = GENERATION_SCHEMA.properties.questions.items;
  for (const f of ['type', 'statement', 'marks', 'difficulty', 'explanation', 'solutionSteps', 'conceptTags']) assert.ok(item.required.includes(f), f);
  assert.deepEqual(item.properties.difficulty.enum, ['easy', 'medium', 'hard', 'very_hard']);
});

test('generation prompt carries the request, the originality rules and the PYQ-inspired / advanced instructions', () => {
  const base = { subject: 'Algorithms', topic: 'Dynamic Programming', counts: { MCQ: 2, MSQ: 0, NAT: 1 }, difficulty: 'hard', concepts: ['knapsack'] };
  const a = buildGenerationPrompt({ ...base, style: 'ADVANCED' });
  assert.match(a.user, /Subject: Algorithms\. Topic: Dynamic Programming\. Difficulty: hard\. Produce exactly: 2 MCQ, 1 NAT/);
  assert.match(a.user, /Focus on these concepts: knapsack/);
  assert.match(a.user, /ADVANCED ORIGINAL/);
  assert.match(a.user, /Do not use real GATE question text/);
  assert.doesNotMatch(a.user, /Concept pattern to build on/);
  const p = buildGenerationPrompt({ ...base, style: 'PYQ_INSPIRED', reference: { statement: 'REFERENCE-STATEMENT', options: [{ key: 'A', text: 'x' }] }, avoid: ['existing one'] });
  assert.match(p.user, /PYQ-INSPIRED/);
  assert.match(p.user, /do NOT copy it/);
  assert.match(p.user, /REFERENCE-STATEMENT/);
  assert.match(p.user, /existing one/);
  assert.match(p.system, /ONLY JSON/);
  assert.equal(PROMPT_VERSION, 'gen-v1');
});

test('the independent solver prompt never contains the answer key or explanation', () => {
  const q = { ...rawMcq(), correctOptions: ['C'], explanation: 'SECRET-EXPLANATION', solutionSteps: ['SECRET-STEP'] };
  const { system, user } = buildVerificationPrompt([q]);
  for (const leak of ['SECRET-EXPLANATION', 'SECRET-STEP', 'correctOptions', 'Correct.']) assert.ok(!user.includes(leak) && !system.includes(leak), leak);
  assert.match(user, /A\) 1/);
  assert.match(system, /not given any answer key/);
});

test('parseJsonText accepts plain and fenced JSON and reports garbage', () => {
  assert.deepEqual(parseJsonText('{"a":1}').value, { a: 1 });
  assert.deepEqual(parseJsonText('```json\n{"a":1}\n```').value, { a: 1 });
  assert.equal(parseJsonText('not json').ok, false);
});

test('a valid generated question becomes an unpublished, unverified draft with the right labels', () => {
  const r = normalizeGenerated(rawMcq(), ctx);
  assert.ok(r.ok, r.errors?.join());
  const q = r.question;
  assert.equal(q.source, 'ADVANCED');
  assert.equal(q.status, 'draft');
  assert.equal(q.verificationStatus, 'draft');
  assert.equal(q.negativeMarks, 0.3333);
  assert.deepEqual(q.aiMeta.model, 'gemini-test');
  assert.equal(q.aiMeta.promptVersion, PROMPT_VERSION);
  assert.equal(q.pyq, undefined); // an AI question can never carry PYQ metadata
  assert.equal(normalizeGenerated(rawMcq(), { ...ctx, style: 'PYQ_INSPIRED' }).question.source, 'PYQ_INSPIRED');
  assert.equal(normalizeGenerated({ ...rawMcq(), difficulty: 'Very Hard' }, ctx).question.difficulty, 'very_hard');
  assert.equal(normalizeGenerated({ ...rawMcq(), difficulty: 'impossible' }, ctx).question.difficulty, 'hard'); // falls back to the request
});

test('malformed model output is rejected, never saved', () => {
  const bad = (patch) => normalizeGenerated({ ...rawMcq(), ...patch }, ctx);
  assert.equal(bad({ correctOptions: ['A', 'B'] }).ok, false); // MCQ needs exactly one
  assert.equal(bad({ correctOptions: ['Z'] }).ok, false);
  assert.equal(bad({ type: 'ESSAY' }).ok, false);
  assert.equal(bad({ marks: 3 }).ok, false);
  assert.equal(bad({ statement: '' }).ok, false);
  assert.equal(bad({ options: [{ key: 'A', text: 'only one' }] }).ok, false);
  assert.equal(normalizeGenerated(null, ctx).ok, false);
  const nat = { type: 'NAT', statement: 'Compute the sum of the first 10 positive integers: ______', marks: 1, difficulty: 'easy', explanation: 'The sum is 55 by n(n+1)/2.', solutionSteps: ['n(n+1)/2'], conceptTags: ['sum'] };
  assert.equal(normalizeGenerated(nat, ctx).ok, false); // no numeric range
  assert.ok(normalizeGenerated({ ...nat, natMin: 55, natMax: 55 }, ctx).ok);
  assert.equal(normalizeGenerated({ ...nat, natMin: 56, natMax: 55 }, ctx).ok, false); // min > max
  const msq = { ...rawMcq(), type: 'MSQ', correctOptions: ['A', 'C'], marks: 2 };
  assert.ok(normalizeGenerated(msq, ctx).ok);
  assert.equal(normalizeGenerated({ ...msq, correctOptions: [] }, ctx).ok, false);
});

test('independent answer comparison is programmatic: MCQ, exact-set MSQ, NAT tolerance, ambiguity', () => {
  const mcq = { type: 'MCQ', correctOptions: ['C'] };
  assert.equal(compareSolverAnswer(mcq, { answer: 'C', ambiguous: false }).agrees, true);
  assert.equal(compareSolverAnswer(mcq, { answer: 'B', ambiguous: false }).agrees, false);
  assert.equal(compareSolverAnswer(mcq, { answer: 'C', ambiguous: true, ambiguityNote: 'two readings' }).agrees, false); // ambiguity blocks agreement
  const msq = { type: 'MSQ', correctOptions: ['A', 'C'] };
  assert.equal(compareSolverAnswer(msq, { answer: 'C, A' }).agrees, true);
  assert.equal(compareSolverAnswer(msq, { answer: 'A' }).agrees, false);
  assert.equal(compareSolverAnswer(msq, { answer: 'A,B,C' }).agrees, false);
  const nat = { type: 'NAT', natAnswer: { min: 4.33, max: 4.34 } };
  assert.equal(compareSolverAnswer(nat, { answer: '4.333' }).agrees, true);
  assert.equal(compareSolverAnswer(nat, { answer: '4.5' }).agrees, false);
  assert.equal(compareSolverAnswer(nat, { answer: 'not a number' }).agrees, false);
});

// ---------------- test builder ----------------
const pool = [];
let n = 0;
for (const subjectId of ['s1', 's2', 's3', 'ga']) {
  for (let i = 0; i < 12; i += 1) pool.push({ id: `q${(n += 1)}`, type: ['MCQ', 'MSQ', 'NAT'][i % 3], marks: (i % 2) + 1, subjectId, topicId: `${subjectId}-t${i % 2}`, difficulty: ['easy', 'medium', 'hard'][i % 3], source: i % 4 === 0 ? 'PYQ' : 'ADVANCED', year: i % 4 === 0 ? 2020 + (i % 3) : undefined });
}

test('selection is distinct, filtered, repeatable and reports shortages', () => {
  const sections = [{ name: 'A', filters: { subjectIds: ['s1'] }, quotas: [{ count: 5 }] }, { name: 'B', filters: { subjectIds: ['s1'] }, quotas: [{ count: 5 }] }];
  const a = selectQuestions({ pool, sections, rng: mulberry32(7) });
  const b = selectQuestions({ pool, sections, rng: mulberry32(7) });
  assert.deepEqual(a, b); // same seed, same test
  const ids = a.sections.flatMap((s) => s.questionIds);
  assert.equal(ids.length, 10);
  assert.equal(new Set(ids).size, 10); // no question appears twice
  assert.ok(ids.every((id) => pool.find((q) => q.id === id).subjectId === 's1'));
  assert.deepEqual(a.shortages, []);

  const short = selectQuestions({ pool, sections: [{ name: 'X', filters: { subjectIds: ['s1'], sources: ['PYQ'] }, quotas: [{ count: 10 }] }], rng: mulberry32(1) });
  assert.equal(short.shortages[0].requested, 10);
  assert.equal(short.shortages[0].found, 3);
});

test('PYQ filters: only PYQ source, and a specific year', () => {
  const s = selectQuestions({ pool, sections: [{ name: 'Y', filters: { sources: ['PYQ'], year: 2020 }, quotas: [{ count: 99 }] }], rng: mulberry32(2) });
  assert.ok(s.sections[0].questionIds.length > 0);
  for (const id of s.sections[0].questionIds) assert.ok(matchesFilters(pool.find((q) => q.id === id), { sources: ['PYQ'], year: 2020 }));
});

test('quotas by marks and type; balanced selection spreads across subjects', () => {
  const m = selectQuestions({ pool, sections: [{ name: 'M', filters: {}, quotas: [{ marks: 2, count: 4 }, { type: 'NAT', count: 3 }] }], rng: mulberry32(3) });
  const picked = m.sections[0].questionIds.map((id) => pool.find((q) => q.id === id));
  assert.equal(picked.filter((q) => q.marks === 2).length >= 4, true);
  const bal = selectQuestions({ pool, sections: [{ name: 'B', filters: { excludeSubjectIds: ['ga'] }, balanceBySubject: true, quotas: [{ count: 9 }] }], rng: mulberry32(4) });
  const counts = {};
  for (const id of bal.sections[0].questionIds) counts[pool.find((q) => q.id === id).subjectId] = (counts[pool.find((q) => q.id === id).subjectId] ?? 0) + 1;
  assert.deepEqual(Object.values(counts).sort(), [3, 3, 3]);
  assert.equal(counts.ga, undefined);
});

test('GATE full-length template: 65 questions, 100 marks, 180 minutes, GA 10 + core 55', () => {
  const total = GATE_FULL_MOCK.sections.flatMap((s) => s.quotas).reduce((a, q) => ({ n: a.n + q.count, marks: a.marks + q.count * q.marks }), { n: 0, marks: 0 });
  assert.deepEqual(total, { n: 65, marks: 100 });
  assert.equal(GATE_FULL_MOCK.durationMinutes, 180);
  const [ga, core] = GATE_FULL_MOCK.sections;
  assert.deepEqual([ga.quotas.reduce((a, q) => a + q.count, 0), core.quotas.reduce((a, q) => a + q.count, 0)], [10, 55]);
  const ids = new Map([['General Aptitude', 'ga'], ['A', 's1']]);
  const [rga, rcore] = resolveTemplate(GATE_FULL_MOCK, ids);
  assert.deepEqual(rga.filters.subjectIds, ['ga']);
  assert.deepEqual(rcore.filters.excludeSubjectIds, ['ga']);
});

test('a template subject missing from the database matches nothing (never everything)', () => {
  const [ga] = resolveTemplate(GATE_FULL_MOCK, new Map());
  assert.deepEqual(ga.filters.subjectIds, ['__missing_subject__']);
  const r = selectQuestions({ pool, sections: [{ name: 'GA', filters: ga.filters, quotas: [{ count: 5 }] }], rng: mulberry32(1) });
  assert.equal(r.sections.length, 0);
  assert.equal(r.shortages[0].found, 0);
});

test('the bundled demo bank cannot fill a full mock, and the builder says so instead of faking it', () => {
  const r = selectQuestions({ pool: pool.slice(0, 20), sections: resolveTemplate(GATE_FULL_MOCK, new Map([['General Aptitude', 'ga']])), rng: mulberry32(9) });
  assert.ok(r.shortages.length > 0);
});

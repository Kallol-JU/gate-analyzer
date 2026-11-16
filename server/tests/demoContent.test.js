import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTestPlans, DEMO_CONTENT, flattenDemoContent } from '../src/seed/demoContent.js';
import { defaultNegativeMarks, validateQuestionRules } from '../src/modules/questions/questionRules.js';
import { computeDistribution, validatePublishable, validateTestConfig } from '../src/modules/tests/testRules.js';

const all = flattenDemoContent();
const seedSource = readFileSync(new URL('../src/seed/seed.js', import.meta.url), 'utf8');

test('72 demo questions: 12 subjects x 2 topics x 3, evenly split across MCQ, MSQ and NAT', () => {
  assert.equal(all.length, 72);
  assert.equal(DEMO_CONTENT.length, 12);
  for (const type of ['MCQ', 'MSQ', 'NAT']) assert.equal(all.filter((q) => q.type === type).length, 24, type);
  for (const s of DEMO_CONTENT) {
    assert.equal(s.topics.length, 2, s.subject);
    for (const t of s.topics) assert.equal(t.questions.length, 3, t.topic);
  }
});

test('every question satisfies the real question rules and is labelled as demo content', () => {
  for (const q of all) {
    const errors = validateQuestionRules({
      type: q.type, options: q.options ?? [], correctOptions: q.correctOptions ?? [], natAnswer: q.natAnswer,
      marks: q.marks, negativeMarks: defaultNegativeMarks(q.type, q.marks), source: 'ADMIN', pyq: undefined,
    });
    assert.deepEqual(errors, [], q.statement);
    assert.ok(q.explanation.includes('Not an official GATE question'), `no demo notice: ${q.statement}`);
    assert.ok([1, 2].includes(q.marks));
    assert.ok(['easy', 'medium', 'hard'].includes(q.difficulty), q.statement);
    assert.ok(!('pyq' in q) && !('year' in q));
  }
});

test('statements are unique and already trimmed (they are the idempotency key)', () => {
  const statements = all.map((q) => q.statement);
  assert.equal(new Set(statements).size, statements.length);
  for (const s of statements) assert.equal(s, s.trim());
});

test('subject and topic names exist in the base seed (seed.js), so references resolve', () => {
  for (const s of DEMO_CONTENT) {
    assert.ok(seedSource.includes(`'${s.subject}'`), `subject not in seed.js: ${s.subject}`);
    for (const t of s.topics) assert.ok(seedSource.includes(`'${t.topic}'`), `topic not in seed.js: ${t.topic}`);
  }
});

test('MSQ has several correct options and NAT has a range', () => {
  for (const q of all.filter((x) => x.type === 'MSQ')) assert.ok(q.correctOptions.length >= 2 && q.correctOptions.length < q.options.length, q.statement);
  for (const q of all.filter((x) => x.type === 'NAT')) assert.ok(q.natAnswer.min <= q.natAnswer.max);
});

test('26 test plans: 2 mocks, 12 subject tests, 12 topic tests, all valid and publishable', () => {
  const plans = buildTestPlans();
  assert.equal(plans.length, 26);
  assert.equal(new Set(plans.map((p) => `${p.kind}|${p.title}`)).size, 26);
  assert.deepEqual(['mock', 'subject', 'topic'].map((k) => plans.filter((p) => p.kind === k).length), [2, 12, 12]);

  // Stand-in database: every demo question is published and public, ids are "Subject|position".
  const info = new Map(all.map((q) => [`${q.subject}|${q.position}`, { _id: `${q.subject}|${q.position}`, type: q.type, marks: q.marks, subjectId: q.subject, topicId: `${q.subject}|${q.topic}`, status: 'published', visibility: 'public', source: 'ADMIN' }]));

  for (const p of plans) {
    const sections = p.sections.map((s) => ({ name: s.name, questionIds: s.items.map((i) => `${i.subject}|${i.position}`) }));
    const config = { kind: p.kind, mode: p.mode, durationMinutes: p.durationMinutes, sections, scope: p.scope ? { subjectId: p.scope.subject, topicId: p.scope.topic && `${p.scope.subject}|${p.scope.topic}` } : undefined };
    assert.ok(p.title.length >= 3 && p.title.length <= 120);
    assert.ok(p.description.includes('Not an official GATE paper'));
    for (const id of sections.flatMap((s) => s.questionIds)) assert.ok(info.has(id), `${p.title}: unknown question ${id}`);
    assert.deepEqual(validateTestConfig(config), [], p.title);
    assert.deepEqual(validatePublishable(config, [...info.values()]), [], p.title);
  }
});

test('mocks are 36 questions each, in two sections, with no question shared between them', () => {
  const [m1, m2] = buildTestPlans().filter((p) => p.kind === 'mock');
  const ids = (p) => p.sections.flatMap((s) => s.items.map((i) => `${i.subject}|${i.position}`));
  for (const m of [m1, m2]) {
    assert.equal(ids(m).length, 36);
    assert.deepEqual(m.sections.map((s) => s.items.length), [3, 33]);
    assert.equal(m.mode, 'competitive');
  }
  assert.equal(ids(m1).filter((id) => ids(m2).includes(id)).length, 0);
  const byKey = new Map(all.map((q) => [`${q.subject}|${q.position}`, q]));
  const d = computeDistribution(ids(m1).map((id) => ({ ...byKey.get(id), subjectId: byKey.get(id).subject })));
  assert.equal(d.totalQuestions, 36);
  assert.ok(d.distribution.byType.MCQ > 0 && d.distribution.byType.MSQ > 0 && d.distribution.byType.NAT > 0);
});

test('subject tests hold the subject\'s 6 questions; topic tests hold 3 questions of one topic', () => {
  for (const p of buildTestPlans()) {
    if (p.kind === 'subject') assert.equal(p.sections[0].items.length, 6);
    if (p.kind === 'topic') {
      const topic = DEMO_CONTENT.find((s) => s.subject === p.scope.subject).topics[0].topic;
      assert.equal(p.scope.topic, topic);
      assert.deepEqual(p.sections[0].items.map((i) => i.position), [0, 1, 2]);
    }
  }
});

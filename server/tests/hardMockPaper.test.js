import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HARD_MOCK_QUESTIONS, HARD_MOCK_TEST_META } from '../src/seed/hardMockPaper.js';
import { defaultNegativeMarks, validateQuestionRules } from '../src/modules/questions/questionRules.js';
import { evaluateQuestionQuality } from '../src/modules/content/questionQuality.js';
import { computeDistribution, validatePublishable, validateTestConfig } from '../src/modules/tests/testRules.js';

const seedSource = readFileSync(new URL('../src/seed/seed.js', import.meta.url), 'utf8');
let latexCheck;
try {
  const { default: katex } = await import('katex');
  latexCheck = (span) => {
    try {
      katex.renderToString(span, { throwOnError: true });
      return null;
    } catch (e) {
      return e.message;
    }
  };
} catch {
  // katex not installed in offline test environment; evaluateQuestionQuality still runs checkLatexStructure.
}

test('hard mock paper has exact GATE CSE structure: 65 questions, 100 marks, 180 minutes', () => {
  assert.equal(HARD_MOCK_QUESTIONS.length, 65);
  assert.equal(HARD_MOCK_TEST_META.durationMinutes, 180);
  assert.equal(HARD_MOCK_TEST_META.kind, 'mock');
  assert.equal(HARD_MOCK_TEST_META.mode, 'competitive');

  const ga = HARD_MOCK_QUESTIONS.filter((q) => q.subject === 'General Aptitude');
  const cs = HARD_MOCK_QUESTIONS.filter((q) => q.subject !== 'General Aptitude');

  assert.equal(ga.length, 10);
  assert.equal(ga.filter((q) => q.marks === 1).length, 5);
  assert.equal(ga.filter((q) => q.marks === 2).length, 5);
  assert.equal(ga.reduce((s, q) => s + q.marks, 0), 15);

  assert.equal(cs.length, 55);
  assert.equal(cs.filter((q) => q.marks === 1).length, 25);
  assert.equal(cs.filter((q) => q.marks === 2).length, 30);
  assert.equal(cs.reduce((s, q) => s + q.marks, 0), 85);

  assert.equal(HARD_MOCK_QUESTIONS.reduce((s, q) => s + q.marks, 0), 100);
});

test('all 12 subjects are covered and all subject/topic names exist in seed.js', () => {
  const subjects = new Set(HARD_MOCK_QUESTIONS.map((q) => q.subject));
  assert.equal(subjects.size, 12);
  for (const q of HARD_MOCK_QUESTIONS) {
    assert.ok(seedSource.includes(`'${q.subject}'`), `subject missing in seed.js: ${q.subject}`);
    assert.ok(seedSource.includes(`'${q.topic}'`), `topic missing in seed.js: ${q.topic}`);
  }
});

test('every question passes questionRules and quality checks', () => {
  const statements = HARD_MOCK_QUESTIONS.map((q) => q.statement);
  assert.equal(new Set(statements).size, 65, 'Duplicate statements found');

  for (const q of HARD_MOCK_QUESTIONS) {
    const candidate = {
      type: q.type,
      statement: q.statement,
      code: q.code,
      options: q.options ?? [],
      correctOptions: q.correctOptions ?? [],
      natAnswer: q.natAnswer,
      marks: q.marks,
      negativeMarks: defaultNegativeMarks(q.type, q.marks),
      difficulty: q.difficulty,
      source: 'ADVANCED',
      status: 'published',
      verificationStatus: 'verified',
      explanation: q.explanation,
    };
    assert.deepEqual(validateQuestionRules(candidate), [], q.statement);
    const quality = evaluateQuestionQuality(candidate, { latexCheck });
    assert.deepEqual(quality.errors, [], `${q.statement}: ${quality.errors.map((e) => e.message).join('; ')}`);
  }
});

test('assembled full-length hard mock test is valid, publishable, and computes 65q / 100m', () => {
  const withIds = HARD_MOCK_QUESTIONS.map((q, idx) => ({
    _id: `q-${idx + 1}`,
    type: q.type,
    marks: q.marks,
    subjectId: q.subject,
    topicId: `${q.subject}|${q.topic}`,
    status: 'published',
    visibility: 'public',
    source: 'ADVANCED',
  }));
  const gaIds = withIds.filter((q) => q.subjectId === 'General Aptitude').map((q) => q._id);
  const csIds = withIds.filter((q) => q.subjectId !== 'General Aptitude').map((q) => q._id);

  const config = {
    kind: HARD_MOCK_TEST_META.kind,
    mode: HARD_MOCK_TEST_META.mode,
    durationMinutes: HARD_MOCK_TEST_META.durationMinutes,
    sections: [
      { name: 'General Aptitude', questionIds: gaIds },
      { name: 'Computer Science and Information Technology', questionIds: csIds },
    ],
  };

  assert.deepEqual(validateTestConfig(config), []);
  assert.deepEqual(validatePublishable(config, withIds), []);
  const dist = computeDistribution(withIds);
  assert.equal(dist.totalQuestions, 65);
  assert.equal(dist.totalMarks, 100);
  assert.ok(dist.distribution.byType.MCQ > 0 && dist.distribution.byType.MSQ > 0 && dist.distribution.byType.NAT > 0);
});

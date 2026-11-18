import test from 'node:test';
import assert from 'node:assert/strict';
import { validateQuestionRules } from '../src/modules/questions/questionRules.js';
import { contentHash, findDuplicates, jaccard, normalizeText } from '../src/modules/content/duplicateDetection.js';
import { checkLatexStructure, evaluateQuestionQuality, mathSpans } from '../src/modules/content/questionQuality.js';
import { flattenDemoContent } from '../src/seed/demoContent.js';

const opts = [['A', 'alpha'], ['B', 'beta'], ['C', 'gamma'], ['D', 'delta']].map(([key, text]) => ({ key, text }));
const base = {
  type: 'MCQ', statement: 'Which Greek letter comes second in the Greek alphabet?', options: opts, correctOptions: ['B'],
  marks: 1, source: 'ADMIN', explanation: 'Beta follows alpha, so the correct option is B in the standard ordering of the alphabet.',
};
const codes = (r) => [...r.errors, ...r.warnings].map((i) => i.code);

test('new sources and very_hard difficulty are accepted; unknown values are not', () => {
  for (const source of ['PYQ_INSPIRED', 'ADVANCED', 'AI', 'ADMIN']) assert.deepEqual(validateQuestionRules({ ...base, source }), [], source);
  assert.deepEqual(validateQuestionRules({ ...base, verificationStatus: 'bogus' }).map((e) => e.path), ['verificationStatus']);
});

test('PYQ metadata: year and session, and only for source PYQ', () => {
  const pyq = { ...base, source: 'PYQ', pyq: { year: 2021, session: 'Set 1' } };
  assert.deepEqual(validateQuestionRules(pyq), []);
  assert.ok(validateQuestionRules({ ...base, source: 'PYQ' }).some((e) => e.path === 'pyq.year'));
  for (const source of ['PYQ_INSPIRED', 'ADVANCED', 'AI']) {
    assert.ok(validateQuestionRules({ ...base, source, pyq: { year: 2021, session: 'Set 1' } }).some((e) => e.path === 'pyq'), source);
  }
});

test('a verified PYQ must record its official paper URL and answer-key reference', () => {
  const pyq = { ...base, source: 'PYQ', pyq: { year: 2021, session: 'Set 1' }, verificationStatus: 'verified' };
  const paths = (q) => validateQuestionRules(q).map((e) => e.path);
  assert.deepEqual(paths(pyq).sort(), ['sourceReference.answerKeyRef', 'sourceReference.paperUrl']);
  assert.deepEqual(validateQuestionRules({ ...pyq, sourceReference: { paperUrl: 'https://example.org/paper.pdf', answerKeyRef: 'Official key, Set 1, Q12' } }), []);
  assert.ok(paths({ ...pyq, sourceReference: { paperUrl: 'javascript:alert(1)', answerKeyRef: 'x' } }).includes('sourceReference.paperUrl'));
  assert.ok(paths({ ...pyq, source: 'PYQ', inspiredByQuestionId: 'abc', sourceReference: { paperUrl: 'https://e.org', answerKeyRef: 'k' } }).includes('inspiredByQuestionId'));
});

test('publication invariant: reviewed sources can be published only when verified; legacy ADMIN keeps old behaviour', () => {
  for (const source of ['PYQ_INSPIRED', 'ADVANCED', 'AI']) {
    for (const verificationStatus of [undefined, 'draft', 'pending_review', 'rejected']) {
      assert.ok(validateQuestionRules({ ...base, source, status: 'published', verificationStatus }).some((e) => e.path === 'status'), `${source}/${verificationStatus}`);
    }
    assert.deepEqual(validateQuestionRules({ ...base, source, status: 'published', verificationStatus: 'verified' }), []);
    assert.deepEqual(validateQuestionRules({ ...base, source, status: 'draft', verificationStatus: 'pending_review' }), []);
  }
  assert.deepEqual(validateQuestionRules({ ...base, source: 'ADMIN', status: 'published' }), []); // existing demo questions
  assert.ok(validateQuestionRules({ ...base, source: 'ADMIN', status: 'published', verificationStatus: 'rejected' }).some((e) => e.path === 'status'));
});

test('MCQ, MSQ and NAT answer rules still hold with the new fields present', () => {
  assert.ok(validateQuestionRules({ ...base, correctOptions: ['A', 'B'] }).some((e) => e.path === 'correctOptions'));
  assert.deepEqual(validateQuestionRules({ ...base, type: 'MSQ', correctOptions: ['A', 'C'], marks: 2 }), []);
  assert.deepEqual(validateQuestionRules({ type: 'NAT', natAnswer: { min: 1, max: 1 }, marks: 2, source: 'ADVANCED' }), []);
  assert.ok(validateQuestionRules({ type: 'NAT', natAnswer: { min: 3, max: 1 }, marks: 2, source: 'ADVANCED' }).some((e) => e.path === 'natAnswer'));
});

test('normalisation keeps signs and comparison symbols', () => {
  assert.notEqual(normalizeText('2'), normalizeText('\u22122'));
  assert.equal(normalizeText('\u22122'), normalizeText('-2'));
  assert.notEqual(normalizeText('a \u2264 b'), normalizeText('a \u2265 b'));
  assert.notEqual(normalizeText('4% lower'), normalizeText('4 lower'));
});

test('normalisation ignores formatting but not values', () => {
  assert.equal(normalizeText('Find  $T(n)$ for\\ n = 8!'), normalizeText('find t(n) for n = 8'));
  assert.notEqual(contentHash({ statement: 'Value of 2^3 is' }), contentHash({ statement: 'Value of 2^4 is' }));
  assert.equal(contentHash({ statement: 'Same', options: [{ key: 'B', text: 'y' }, { key: 'A', text: 'x' }] }), contentHash({ statement: 'Same', options: [{ key: 'A', text: 'x' }, { key: 'B', text: 'y' }] }));
  assert.equal(jaccard(new Set(['a', 'b']), new Set(['a', 'b'])), 1);
});

test('duplicate detection: exact, near and unrelated', () => {
  const stmt = 'A cache has a hit time of 2 ns, a miss rate of 10 percent and a miss penalty of 50 ns. Find the average memory access time in ns.';
  const existing = [
    { id: 'same', statement: stmt },
    { id: 'near', statement: stmt.replace('10 percent', '12 percent') },
    { id: 'other', statement: 'Which sorting algorithm has the best worst-case time complexity among the following choices?' },
  ];
  const found = findDuplicates({ statement: stmt }, existing);
  assert.deepEqual(found.map((f) => f.id), ['same', 'near']);
  assert.equal(found[0].exact, true);
  assert.ok(found[1].similarity > 0.7 && found[1].similarity < 1);
});

test('LaTeX structure checks', () => {
  assert.equal(checkLatexStructure('Let $x^2$ and $\\frac{a}{b}$ be given.'), null);
  assert.match(checkLatexStructure('Let $x^2 be given'), /Unbalanced \$/);
  assert.match(checkLatexStructure('Value $\\frac{a}{b$'), /Unbalanced braces/);
  assert.match(checkLatexStructure('$\\begin{pmatrix} 1 & 2 \\end{bmatrix}$'), /Mismatched/); // names must match, not just counts
  assert.equal(checkLatexStructure('$\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$'), null);
  assert.match(checkLatexStructure('$\\begin{pmatrix} 1 $ and $ 2$'), /Mismatched|Unbalanced/);
  assert.deepEqual(mathSpans('a $x$ b $$y$$ c'), ['x', 'y']);
});

test('quality engine: a good question passes; defects are reported', () => {
  assert.equal(evaluateQuestionQuality(base).blocking, false);
  assert.ok(codes(evaluateQuestionQuality({ ...base, statement: 'Which one?' })).includes('STATEMENT_TOO_SHORT'));
  assert.ok(codes(evaluateQuestionQuality({ ...base, statement: 'TODO write the real question about Greek letters here' })).includes('PLACEHOLDER_TEXT'));
  assert.ok(codes(evaluateQuestionQuality({ ...base, options: [opts[0], { key: 'B', text: ' Alpha ' }, opts[2], opts[3]] })).includes('DUPLICATE_OPTIONS'));
  assert.ok(codes(evaluateQuestionQuality({ ...base, correctOptions: ['A', 'B'] })).includes('RULE'));
});

test('an unfilled import template is rejected as placeholder text', () => {
  assert.ok(codes(evaluateQuestionQuality({ ...base, statement: 'REPLACE WITH THE EXACT TEXT FROM THE OFFICIAL PAPER' })).includes('PLACEHOLDER_TEXT'));
});

test('quality engine: explanation must agree with the key', () => {
  const wrong = evaluateQuestionQuality({ ...base, explanation: 'Alpha is first and beta second, so the correct option is C for this question about order.' });
  assert.ok(codes(wrong).includes('EXPLANATION_MISMATCH') && wrong.blocking);
  const nat = { type: 'NAT', statement: 'Compute the value of 7 times 6 and report the number as the answer here: ______', natAnswer: { min: 42, max: 42 }, marks: 1, source: 'ADVANCED' };
  assert.ok(codes(evaluateQuestionQuality({ ...nat, explanation: 'Multiplying seven by six, the answer is 24, which we report.' })).includes('EXPLANATION_MISMATCH'));
  assert.ok(!codes(evaluateQuestionQuality({ ...nat, explanation: 'Multiplying seven by six, the answer is 42, which we report.' })).includes('EXPLANATION_MISMATCH'));
});

test('quality engine: "A, B and D" in an explanation is read as options A, B, D (not the letters in "and")', () => {
  const msq = { ...base, type: 'MSQ', correctOptions: ['A', 'B', 'D'], marks: 2, explanation: 'The correct options are A, B and D, because each of those statements follows from the definition.' };
  assert.ok(!codes(evaluateQuestionQuality(msq)).includes('EXPLANATION_MISMATCH'));
  assert.ok(codes(evaluateQuestionQuality({ ...msq, correctOptions: ['A', 'B'] })).includes('EXPLANATION_MISMATCH'));
});

test('quality engine: reviewed sources are held to a higher standard', () => {
  const adv = { ...base, source: 'ADVANCED', explanation: 'Too short.' };
  assert.ok(codes(evaluateQuestionQuality(adv)).includes('EXPLANATION_MISSING'));
  assert.ok(codes(evaluateQuestionQuality({ ...base, source: 'ADVANCED', type: 'MSQ', correctOptions: ['A'], marks: 2, negativeMarks: 1 })).includes('NEGATIVE_MARKS'));
  assert.ok(codes(evaluateQuestionQuality({ ...base, difficulty: 'hard', source: 'ADVANCED', solutionSteps: ['one'] })).includes('FEW_STEPS'));
  assert.ok(codes(evaluateQuestionQuality({ ...base, difficulty: 'easy', estimatedTimeSeconds: 600 })).includes('DIFFICULTY_TIME'));
  assert.ok(codes(evaluateQuestionQuality({ ...base, optionAnalysis: [{ key: 'Z', analysis: 'x' }] })).includes('OPTION_ANALYSIS_KEY'));
});

test('quality engine: duplicates block, similar questions warn, an injected renderer is used', () => {
  const existing = [{ id: 'q9', statement: base.statement, options: opts }];
  const dup = evaluateQuestionQuality(base, { existing });
  assert.ok(dup.blocking && codes(dup).includes('DUPLICATE_EXACT'));
  const withLatex = evaluateQuestionQuality({ ...base, statement: 'Which value is given by $\\badcommand$ in this standard question?' }, { latexCheck: (s) => (s.includes('badcommand') ? 'Undefined control sequence' : null) });
  assert.ok(codes(withLatex).includes('LATEX_INVALID'));
});

test('BACKWARD COMPATIBILITY: all 72 existing demo questions pass the new engine (as legacy ADMIN content)', () => {
  const demo = flattenDemoContent();
  assert.equal(demo.length, 72);
  const seen = [];
  for (const d of demo) {
    const q = { ...d, source: 'ADMIN', status: 'published', negativeMarks: undefined };
    const result = evaluateQuestionQuality(q, { existing: seen });
    assert.deepEqual(result.errors, [], `${d.subject} / ${d.statement.slice(0, 50)}: ${JSON.stringify(result.errors)}`);
    seen.push({ id: String(seen.length), statement: d.statement, code: d.code, options: d.options });
  }
});

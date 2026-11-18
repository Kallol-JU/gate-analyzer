import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SAMPLE_QUESTIONS } from '../src/seed/sampleContent.js';
import { flattenDemoContent } from '../src/seed/demoContent.js';
import { contentHash } from '../src/modules/content/duplicateDetection.js';
import { evaluateQuestionQuality } from '../src/modules/content/questionQuality.js';
import { validateQuestionRules } from '../src/modules/questions/questionRules.js';

const seedSource = readFileSync(new URL('../src/seed/seed.js', import.meta.url), 'utf8');
const bySubject = (s) => SAMPLE_QUESTIONS.find((q) => q.subject === s);
const demo = flattenDemoContent().map((d, i) => ({ id: `demo${i}`, statement: d.statement, code: d.code, options: d.options }));

test('10 samples: 7 advanced + 3 PYQ-inspired, none labelled PYQ, all drafts awaiting review', () => {
  assert.equal(SAMPLE_QUESTIONS.length, 10);
  assert.equal(SAMPLE_QUESTIONS.filter((q) => q.source === 'ADVANCED').length, 7);
  assert.equal(SAMPLE_QUESTIONS.filter((q) => q.source === 'PYQ_INSPIRED').length, 3);
  for (const q of SAMPLE_QUESTIONS) {
    assert.notEqual(q.source, 'PYQ');
    assert.ok(!q.pyq && !q.status && !q.verificationStatus, 'seed must decide publication state, not the data');
    if (q.source === 'PYQ_INSPIRED') assert.match(q.inspirationNote, /No specific previous-year question is referenced/);
  }
});

test('every sample passes the real rules and the quality engine, against the 72 demo questions and each other', () => {
  const seen = [...demo];
  for (const { subject, topic, ...q } of SAMPLE_QUESTIONS) {
    const input = { ...q, status: 'draft', verificationStatus: 'pending_review' };
    assert.deepEqual(validateQuestionRules(input), [], q.statement.slice(0, 40));
    const r = evaluateQuestionQuality(input, { existing: seen });
    assert.deepEqual(r.errors, [], `${subject}: ${JSON.stringify(r.errors)}`);
    assert.ok(q.solutionSteps.length >= 3 && q.commonMistakes.length >= 1 && q.conceptTags.length >= 2 && q.learningObjective && q.estimatedTimeSeconds);
    seen.push({ id: contentHash(q), statement: q.statement, code: q.code, options: q.options });
  }
});

test('subject and topic names exist in the base seed so the references resolve', () => {
  for (const q of SAMPLE_QUESTIONS) {
    assert.ok(seedSource.includes(`'${q.subject}'`), q.subject);
    assert.ok(seedSource.includes(`'${q.topic}'`), q.topic);
  }
});

test('numerical answers are re-derived independently', () => {
  // Matrix chain
  const p = [10, 20, 5, 30, 8];
  const n = p.length - 1;
  const m = Array.from({ length: n + 1 }, () => Array(n + 1).fill(0));
  for (let L = 2; L <= n; L += 1) for (let i = 1; i <= n - L + 1; i += 1) { const j = i + L - 1; m[i][j] = Infinity; for (let k = i; k < j; k += 1) m[i][j] = Math.min(m[i][j], m[i][k] + m[k + 1][j] + p[i - 1] * p[k] * p[j]); }
  assert.equal(m[1][n], bySubject('Algorithms').natAnswer.min);
  // Nested loop
  let c = 0;
  for (let i = 1; i <= 10; i += 1) for (let j = i; j <= 10; j += i) c += 1;
  assert.equal(c, bySubject('Programming and Data Structures').natAnswer.min);
  // SRTF average waiting time
  const P = [{ a: 0, b: 8 }, { a: 1, b: 4 }, { a: 2, b: 9 }, { a: 3, b: 5 }];
  const rem = P.map((x) => x.b); const fin = []; let t = 0; let done = 0;
  while (done < 4) { let best = -1; for (let i = 0; i < 4; i += 1) if (P[i].a <= t && rem[i] > 0 && (best < 0 || rem[i] < rem[best])) best = i; if (best < 0) { t += 1; continue; } rem[best] -= 1; t += 1; if (rem[best] === 0) { fin[best] = t; done += 1; } }
  assert.equal(P.map((x, i) => fin[i] - x.a - x.b).reduce((a, b) => a + b) / 4, bySubject('Operating Systems').natAnswer.min);
  // Candidate keys by brute force
  const fds = [['AB', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'A']];
  const closure = (s) => { const r = new Set(s); let ch = true; while (ch) { ch = false; for (const [l, x] of fds) if ([...l].every((a) => r.has(a)) && !r.has(x)) { r.add(x); ch = true; } } return r; };
  const subsets = []; for (let mask = 1; mask < 32; mask += 1) subsets.push([...'ABCDE'].filter((_, i) => (mask >> i) & 1).join(''));
  const supers = subsets.filter((s) => closure(s).size === 5);
  assert.equal(supers.filter((s) => !supers.some((o) => o !== s && [...o].every((x) => s.includes(x)))).length, bySubject('Databases').natAnswer.min);
  // Bounded solutions
  let cnt = 0; for (let a = 2; a <= 12; a += 1) for (let b = 0; b <= 3; b += 1) for (let d = 0; d <= 12; d += 1) if (12 - a - b - d >= 0) cnt += 1;
  assert.equal(cnt, bySubject('Discrete Mathematics').natAnswer.min);
  // Window and AMAT
  assert.equal(Math.ceil(1 + (2 * 25) / (8000 / 8e6 * 1000)), bySubject('Computer Networks').natAnswer.min);
  const amat = 1 + 0.08 * (6 + 0.25 * 80);
  const { min, max } = bySubject('Computer Organization and Architecture').natAnswer;
  assert.ok(amat >= min && amat <= max);
  // Overflow MSQ
  const ov = (a, b) => a + b < -128 || a + b > 127;
  assert.deepEqual([ov(100, 27), ov(100, 28), ov(-100, -28), ov(-100, -29)], [false, true, false, true]);
  assert.deepEqual(bySubject('Digital Logic').correctOptions, ['B', 'D']);
  // Master theorem: T(n)/(n log^2 n) converges to a constant, so n log^2 n is tight (option B)
  const T = new Map(); const f = (x) => (x <= 1 ? 1 : T.get(x) ?? (T.set(x, 3 * f(x / 3) + x * Math.log2(x)), T.get(x)));
  const r1 = f(3 ** 10) / (3 ** 10 * Math.log2(3 ** 10) ** 2); const r2 = f(3 ** 12) / (3 ** 12 * Math.log2(3 ** 12) ** 2);
  assert.ok(Math.abs(r1 - r2) < 0.02);
  assert.deepEqual(bySubject('Algorithms') && SAMPLE_QUESTIONS.find((q) => q.source === 'PYQ_INSPIRED' && q.type === 'MCQ').correctOptions, ['B']);
});

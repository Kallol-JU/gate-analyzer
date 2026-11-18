// Pure functions. Automated quality checks for a question, beyond the structural rules.
// These catch mistakes; they do NOT prove a question is correct. Human verification stays mandatory.
import { defaultNegativeMarks, OPTION_KEYS, REVIEWED_SOURCES, validateQuestionRules } from '../questions/questionRules.js';
import { findDuplicates, NEAR_DUPLICATE_THRESHOLD, normalizeText } from './duplicateDetection.js';

const PLACEHOLDER = /\b(todo|tbd|fixme|lorem|xxx)\b|\breplace (?:this|with)\b|\[\s*insert|<\s*insert/i;
const MATH_SPAN = /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g;

/** Structural LaTeX checks that need no renderer: balanced $, braces and \begin/\end. Returns a message or null. */
export function checkLatexStructure(text) {
  const t = String(text ?? '').replace(/\\\$/g, '');
  if ((t.match(/\$/g) ?? []).length % 2 !== 0) return 'Unbalanced $ math delimiters.';
  for (const span of t.match(MATH_SPAN) ?? []) {
    let depth = 0;
    for (const ch of span.replace(/\\[{}]/g, '')) {
      if (ch === '{') depth += 1;
      if (ch === '}') depth -= 1;
      if (depth < 0) return `Unbalanced braces in ${span.slice(0, 40)}`;
    }
    if (depth !== 0) return `Unbalanced braces in ${span.slice(0, 40)}`;
    const stack = [];
    for (const m of span.matchAll(/\\(begin|end)\{([^}]+)\}/g)) {
      if (m[1] === 'begin') stack.push(m[2]);
      else if (stack.pop() !== m[2]) return `Mismatched \\begin/\\end in ${span.slice(0, 40)}`;
    }
    if (stack.length) return `Mismatched \\begin/\\end in ${span.slice(0, 40)}`;
  }
  return null;
}

/** Every math span in the text, without delimiters (for an injected real renderer such as KaTeX). */
export function mathSpans(text) {
  return (String(text ?? '').match(MATH_SPAN) ?? []).map((s) => (s.startsWith('$$') ? s.slice(2, -2) : s.slice(1, -1)));
}

/** Compares the answer an explanation states ("the correct option is B", "the answer is 21") with the key. */
function explanationConflicts(q) {
  const text = String(q.explanation ?? '');
  const issues = [];
  if (q.type === 'NAT' && q.natAnswer) {
    const m = text.match(/(?:answer|value|result)\s*(?:is|=|:)\s*(-?\d+(?:\.\d+)?)/i);
    if (m) {
      const v = Number(m[1]);
      if (v < q.natAnswer.min - 1e-6 || v > q.natAnswer.max + 1e-6) issues.push(`The explanation states ${v}, outside the accepted range ${q.natAnswer.min} to ${q.natAnswer.max}.`);
    }
  } else if (q.options?.length) {
    const m = text.match(/(?:correct\s+(?:option|answer|options)|answer)\s*(?:is|are|:)\s*\(?([A-F](?:\s*(?:,|and|&)\s*[A-F])*)\)?(?![A-Za-z])/i);
    if (m) {
      // Only standalone letters: the A and D inside the word "and" are not option letters.
      const stated = [...new Set([...m[1].matchAll(/\b[A-F]\b/g)].map((x) => x[0]))].sort();
      const key = [...(q.correctOptions ?? [])].sort();
      if (stated.join() !== key.join()) issues.push(`The explanation names option(s) ${stated.join(', ')} but the key is ${key.join(', ')}.`);
    }
  }
  return issues;
}

/**
 * q: plain question { type, statement, code, options, correctOptions, natAnswer, marks, negativeMarks, difficulty,
 *    source, pyq, status, verificationStatus, explanation, solutionSteps, optionAnalysis, estimatedTimeSeconds, sourceReference }
 * existing: [{ id, statement, code, options, contentHash? }] to compare against (exclude q itself).
 * latexCheck: optional (spanText) => string|null, for a real renderer.
 * Returns { errors, warnings, duplicates, blocking } where each issue is { code, message, path? }.
 */
export function evaluateQuestionQuality(q, { existing = [], latexCheck } = {}) {
  const errors = [];
  const warnings = [];
  const err = (code, message, path) => errors.push({ code, message, path });
  const warn = (code, message, path) => warnings.push({ code, message, path });
  const reviewed = REVIEWED_SOURCES.includes(q.source);

  // Structural rules (types, answer key, PYQ metadata, publication invariant).
  for (const e of validateQuestionRules(q)) err('RULE', e.message, e.path);

  // 1. Complete, unambiguous statement (automated part).
  const statement = String(q.statement ?? '').trim();
  if (statement.length < 25) err('STATEMENT_TOO_SHORT', 'The statement is too short to be a complete question.', 'statement');
  if (PLACEHOLDER.test(statement) || statement.endsWith('...')) err('PLACEHOLDER_TEXT', 'The statement contains placeholder text.', 'statement');
  if (q.type === 'NAT' && !/_{3,}|\?|find|compute|calculate|determine|value|number|how many/i.test(statement)) {
    warn('NAT_NO_PROMPT', 'A NAT statement should clearly ask for a numerical value.', 'statement');
  }

  // Options.
  if (q.type !== 'NAT') {
    const texts = (q.options ?? []).map((o) => normalizeText(o.text));
    if (new Set(texts).size !== texts.length) err('DUPLICATE_OPTIONS', 'Two options have the same text.', 'options');
    if ((q.options ?? []).length !== 4) warn('OPTION_COUNT', 'GATE questions normally have exactly 4 options.', 'options');
  }

  // 6. Marking rules.
  if (q.type === 'MCQ' && q.negativeMarks != null && Math.abs(q.negativeMarks - defaultNegativeMarks('MCQ', q.marks)) > 1e-3) {
    warn('NEGATIVE_MARKS', `GATE MCQ negative marking is 1/3 of the marks (${defaultNegativeMarks('MCQ', q.marks)}).`, 'negativeMarks');
  }
  if (q.type !== 'MCQ' && q.negativeMarks > 0) (reviewed ? err : warn)('NEGATIVE_MARKS', 'MSQ and NAT questions have no negative marking in GATE.', 'negativeMarks');

  // 7. Explanation agrees with the answer.
  const explanation = String(q.explanation ?? '').trim();
  if (reviewed && explanation.length < 40) err('EXPLANATION_MISSING', 'A reviewed question needs an explanation of at least a sentence or two.', 'explanation');
  else if (!explanation) warn('EXPLANATION_MISSING', 'No explanation.', 'explanation');
  if (explanation && normalizeText(explanation) === normalizeText(statement)) err('EXPLANATION_IS_STATEMENT', 'The explanation repeats the statement.', 'explanation');
  for (const m of explanationConflicts(q)) err('EXPLANATION_MISMATCH', m, 'explanation');

  // Rich solution fields.
  const steps = q.solutionSteps ?? [];
  if (reviewed && steps.length === 0) warn('NO_SOLUTION_STEPS', 'Add step-by-step solution steps.', 'solutionSteps');
  if (['hard', 'very_hard'].includes(q.difficulty) && steps.length > 0 && steps.length < 3) warn('FEW_STEPS', 'A hard question usually needs at least 3 solution steps.', 'solutionSteps');
  for (const a of q.optionAnalysis ?? []) {
    if (!OPTION_KEYS.includes(a.key) || !(q.options ?? []).some((o) => o.key === a.key)) err('OPTION_ANALYSIS_KEY', `Option analysis refers to a missing option "${a.key}".`, 'optionAnalysis');
  }
  if (q.type !== 'NAT' && (q.optionAnalysis ?? []).length > 0 && q.optionAnalysis.length < (q.options ?? []).length) warn('OPTION_ANALYSIS_PARTIAL', 'Option analysis does not cover every option.', 'optionAnalysis');

  // 10. Difficulty vs estimated time (a heuristic, shown as warnings).
  const t = q.estimatedTimeSeconds;
  if (t != null) {
    if (q.difficulty === 'easy' && t > 180) warn('DIFFICULTY_TIME', 'An easy question should not need more than about 3 minutes.', 'estimatedTimeSeconds');
    if (q.difficulty === 'very_hard' && t < 90) warn('DIFFICULTY_TIME', 'A very hard question is unlikely to take under 90 seconds.', 'estimatedTimeSeconds');
    if (q.marks === 1 && t > 300) warn('DIFFICULTY_TIME', 'A 1-mark question should not need more than about 5 minutes.', 'estimatedTimeSeconds');
  }

  // 11. LaTeX.
  const texts = [['statement', q.statement], ['explanation', q.explanation], ...(q.options ?? []).map((o) => [`option ${o.key}`, o.text]), ...steps.map((s, i) => [`step ${i + 1}`, s])];
  for (const [where, text] of texts) {
    const structural = checkLatexStructure(text);
    if (structural) err('LATEX_INVALID', `${where}: ${structural}`, 'latex');
    else if (latexCheck) for (const span of mathSpans(text)) {
      const problem = latexCheck(span);
      if (problem) err('LATEX_INVALID', `${where}: ${problem}`, 'latex');
    }
  }

  // 8. Duplicates.
  const duplicates = findDuplicates(q, existing);
  for (const d of duplicates) {
    if (d.exact) err('DUPLICATE_EXACT', `Identical to existing question ${d.id}.`, 'statement');
    else if (d.similarity >= NEAR_DUPLICATE_THRESHOLD) err('DUPLICATE_NEAR', `${Math.round(d.similarity * 100)}% similar to existing question ${d.id}.`, 'statement');
    else warn('SIMILAR_QUESTION', `${Math.round(d.similarity * 100)}% similar to existing question ${d.id}.`, 'statement');
  }

  return { errors, warnings, duplicates, blocking: errors.length > 0 };
}

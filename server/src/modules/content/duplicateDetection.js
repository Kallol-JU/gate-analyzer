// Pure functions (node:crypto only). Detects exact and near-duplicate questions.
import { createHash } from 'node:crypto';

/**
 * Lowercase, drop LaTeX punctuation and spacing, keep words, numbers, operators and math symbols.
 * Symbols matter: "2" vs "-2" and "a <= b" vs "a >= b" must NOT normalise to the same text.
 */
export function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[\u2212\u2013\u2014]/g, '-') // unicode minus and dashes -> ASCII minus
    .replace(/\\/g, ' ')
    .replace(/[${}^_]/g, ' ')
    .replace(/[^\p{L}\p{N}\p{S}%.\s*/-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Everything a student reads: statement, code and the option texts in key order. */
export function questionText(q) {
  const options = [...(q.options ?? [])].sort((a, b) => String(a.key).localeCompare(String(b.key))).map((o) => o.text);
  return [q.statement, q.code, ...options].filter(Boolean).join(' ');
}

export function contentHash(q) {
  return createHash('sha256').update(normalizeText(questionText(q))).digest('hex').slice(0, 32);
}

function shingles(text, n = 2) {
  const words = normalizeText(text).split(' ').filter(Boolean);
  if (words.length <= n) return new Set([words.join(' ')]);
  const set = new Set();
  for (let i = 0; i + n <= words.length; i += 1) set.add(words.slice(i, i + n).join(' '));
  return set;
}

export function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter);
}

export const NEAR_DUPLICATE_THRESHOLD = 0.85; // blocks verification
export const SIMILAR_WARNING_THRESHOLD = 0.7; // shown as a warning

/**
 * existing: [{ id, statement, code?, options? }]. Returns matches at or above the warning threshold,
 * most similar first: [{ id, similarity, exact }].
 */
export function findDuplicates(candidate, existing, { warn = SIMILAR_WARNING_THRESHOLD } = {}) {
  const hash = contentHash(candidate);
  const shingleSet = shingles(questionText(candidate));
  const matches = [];
  for (const e of existing) {
    const exact = (e.contentHash ?? contentHash(e)) === hash;
    const similarity = exact ? 1 : jaccard(shingleSet, shingles(questionText(e)));
    if (exact || similarity >= warn) matches.push({ id: String(e.id), similarity: Math.round(similarity * 1000) / 1000, exact });
  }
  return matches.sort((a, b) => b.similarity - a.similarity);
}

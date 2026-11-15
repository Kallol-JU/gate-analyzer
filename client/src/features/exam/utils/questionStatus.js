import { PALETTE_STATUS as S, PALETTE_STATUS_ORDER } from '../constants.js';

/** MCQ answer is a key string, MSQ an array of keys, NAT a numeric string. */
export function hasAnswer(answer) {
  if (answer == null) return false;
  if (Array.isArray(answer)) return answer.length > 0;
  const text = String(answer).trim();
  // Partial NAT input such as "-" or "." is not an answer yet.
  return text !== '' && text !== '-' && text !== '.' && text !== '-.';
}

/**
 * The five palette states are derived from three facts, never stored separately:
 *   visited, has an answer, marked for review.
 * The same rule is used by the server in Phase 4.
 */
export function deriveStatus({ visited, answer, marked }) {
  if (!visited) return S.NOT_VISITED;
  const answered = hasAnswer(answer);
  if (marked && answered) return S.ANSWERED_MARKED;
  if (marked) return S.MARKED;
  if (answered) return S.ANSWERED;
  return S.NOT_ANSWERED;
}

/** [status, status, ...] -> { answered: n, not_answered: n, ... } (all five keys always present) */
export function countStatuses(statuses) {
  const counts = Object.fromEntries(PALETTE_STATUS_ORDER.map((s) => [s, 0]));
  statuses.forEach((s) => {
    counts[s] += 1;
  });
  return counts;
}

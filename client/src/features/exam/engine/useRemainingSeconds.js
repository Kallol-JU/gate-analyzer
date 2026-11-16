import { useEffect, useState } from 'react';
import { useExamStore } from './examStore.js';

const secondsLeft = (anchor) => Math.max(0, Math.ceil((anchor.remainingMs - (performance.now() - anchor.perf)) / 1000));

/**
 * Seconds left, derived from the server's last report plus monotonic time since then.
 * Returns null until the server's first report has arrived (so "0" is never shown by mistake).
 * The interval only triggers a repaint; the value is computed fresh on every render, it is not
 * counted down by the interval, and the server enforces expiry regardless of what is displayed.
 */
export function useRemainingSeconds() {
  const anchor = useExamStore((s) => s.anchor);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);

  return anchor ? secondsLeft(anchor) : null;
}

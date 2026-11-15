import { useEffect, useState } from 'react';

/**
 * PROTOTYPE · a plain local countdown, only to show the timer in the header.
 * The real exam timer (Phase 4) is NOT a client-side counter: it is computed from a
 * server-issued expiry time so refreshing or changing the device clock cannot cheat it.
 */
export function useDemoCountdown(totalSeconds) {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  return remaining;
}

import { sweepExpiredAttempts } from '../modules/attempts/attempt.service.js';

/**
 * Closes attempts whose time has run out even if the student closed the browser.
 * Every read and write also finalises expired attempts lazily, so correctness does not depend on this
 * timer (important on hosts that sleep): the sweeper just makes results appear without a visit.
 */
export function startAttemptSweeper(intervalMs = 30_000) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const n = await sweepExpiredAttempts();
      if (n) console.log(`Auto-submitted ${n} expired attempt(s)`);
    } catch (err) {
      console.error('Attempt sweeper failed:', err.message);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref();
  tick();
  return () => clearInterval(timer);
}

const pad = (n) => String(n).padStart(2, '0');

/** 10800 -> "03:00:00". Used by the exam countdown. */
export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** 8460 -> "2h 21m". Used in tables and stat strips. */
export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${pad(m)}m`;
}

/** Seconds -> "1d 4h 12m" style uptime. */
export function formatUptime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function formatDate(isoString) {
  return dateFormatter.format(new Date(isoString));
}

/**
 * Marks as shown on the exam screen. Negative marks of 1/3 and 2/3 are shown as
 * fractions (GATE convention) instead of 0.33 / 0.67.
 */
export function formatMarkValue(value) {
  if (Number.isInteger(value)) return String(value);
  const thirds = value * 3;
  if (Math.abs(thirds - Math.round(thirds)) < 1e-9) return `${Math.round(thirds)}/3`;
  return String(Number(value.toFixed(2)));
}

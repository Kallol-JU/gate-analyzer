/** Joins class names, skipping falsy values. Tiny replacement for clsx. */
export function cn(...parts) {
  return parts.flat().filter(Boolean).join(' ');
}

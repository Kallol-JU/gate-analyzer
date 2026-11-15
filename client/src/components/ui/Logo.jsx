import { cn } from '../../utils/cn.js';
import { APP_NAME } from '../../utils/constants.js';

/**
 * The mark is the four question-palette shapes: not visited, not answered,
 * answered, marked for review. Colours come from the palette tokens.
 */
export default function Logo({ className, showText = true }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-lg font-bold tracking-tight', className)}>
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" className="shrink-0">
        <rect x="1" y="1" width="11" height="11" rx="2" className="fill-white stroke-ink-400" strokeWidth="1.5" />
        <rect x="14" y="1" width="11" height="11" rx="5.5" className="fill-st-marked" />
        <path d="M1 14h11v7a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4z" className="fill-st-notanswered" />
        <path d="M14 25v-7a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v7z" className="fill-st-answered" />
      </svg>
      {showText && <span>{APP_NAME}</span>}
    </span>
  );
}

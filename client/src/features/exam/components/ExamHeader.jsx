import Button from '../../../components/ui/Button.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import { cn } from '../../../utils/cn.js';
import { formatClock } from '../../../utils/formatTime.js';

const LOW_TIME_SECONDS = 10 * 60;

/**
 * Top bar of the CBT screen: exam title, candidate, countdown, submit.
 * The countdown value is supplied by the parent. In the real exam (Phase 4) it is derived
 * from the server's expiry time; this component only displays it.
 */
export default function ExamHeader({ title, subtitle, candidate, remainingSeconds, onSubmit, onOpenPalette }) {
  const low = remainingSeconds <= LOW_TIME_SECONDS;

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-ink-200 bg-white px-4 py-2.5 sm:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold text-ink-900">{title}</h1>
        {subtitle && <p className="truncate text-xs text-ink-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <div className="hidden items-center gap-2.5 text-right md:flex">
          <div className="leading-tight">
            <p className="text-sm font-medium text-ink-900">{candidate.name}</p>
            <p className="text-xs text-ink-500">{candidate.rollNo}</p>
          </div>
          <span className="grid size-9 place-items-center rounded-full bg-ink-100 text-sm font-semibold text-ink-700">
            {candidate.name.charAt(0)}
          </span>
        </div>

        <div
          role="timer"
          aria-label="Time left"
          className={cn(
            'flex items-center gap-2 rounded-md border px-3 py-1.5',
            low ? 'border-danger-600 bg-danger-50 text-danger-700' : 'border-ink-200 bg-ink-50 text-ink-900',
          )}
        >
          <Icon name="clock" className="size-4" />
          <div className="leading-tight">
            <p className="text-[11px] text-ink-500">Time left</p>
            <p className="text-base font-semibold tabular-nums">{formatClock(remainingSeconds)}</p>
          </div>
        </div>

        <Button variant="secondary" size="md" className="lg:hidden" onClick={onOpenPalette}>
          <Icon name="grid" className="size-4" />
          Palette
        </Button>

        <Button variant="primary" size="md" onClick={onSubmit}>
          Submit
        </Button>
      </div>
    </header>
  );
}

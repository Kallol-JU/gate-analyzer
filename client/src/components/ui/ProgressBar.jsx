import { cn } from '../../utils/cn.js';

const tones = {
  primary: 'bg-primary-600',
  success: 'bg-success-600',
  danger: 'bg-danger-600',
  warning: 'bg-warning-600',
};

export default function ProgressBar({ value, tone = 'primary', label, className }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-ink-100', className)}
    >
      <div className={cn('h-full rounded-full', tones[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

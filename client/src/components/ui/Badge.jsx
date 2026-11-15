import { cn } from '../../utils/cn.js';

const tones = {
  neutral: 'bg-ink-100 text-ink-700',
  primary: 'bg-primary-50 text-primary-700',
  success: 'bg-success-50 text-success-700',
  danger: 'bg-danger-50 text-danger-700',
  warning: 'bg-warning-50 text-warning-700',
  purple: 'bg-st-marked/10 text-st-marked',
};

export default function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium leading-5',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

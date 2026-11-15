import Icon from '../../../components/ui/Icon.jsx';
import { cn } from '../../../utils/cn.js';
import { PALETTE_STATUS as S } from '../constants.js';

// Shape AND colour distinguish the states, so the palette does not rely on colour alone.
const SHAPE = {
  [S.NOT_VISITED]: 'rounded-md border border-ink-300 bg-white text-ink-700',
  [S.NOT_ANSWERED]: 'rounded-t-md rounded-b-[45%] bg-st-notanswered text-white',
  [S.ANSWERED]: 'rounded-b-md rounded-t-[45%] bg-st-answered text-white',
  [S.MARKED]: 'rounded-full bg-st-marked text-white',
  [S.ANSWERED_MARKED]: 'rounded-full bg-st-marked text-white',
};

const SIZE = {
  sm: 'size-7 text-xs',
  md: 'size-9 text-sm',
};

export default function StatusSwatch({ status, size = 'md', children, className }) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center font-semibold tabular-nums',
        SIZE[size],
        SHAPE[status],
        className,
      )}
    >
      {children}
      {status === S.ANSWERED_MARKED && (
        <span className="absolute -bottom-1 -right-1 grid size-3.5 place-items-center rounded-full bg-st-answered ring-2 ring-white">
          <Icon name="check" className="size-2.5 text-white" strokeWidth={3.5} />
        </span>
      )}
    </span>
  );
}

import Button from '../../../components/ui/Button.jsx';

/**
 * Bottom action bar. Left: review and clear. Right: previous, next, save & next.
 * All handlers come from the parent; this component holds no exam state.
 */
export default function BottomNav({ onMarkNext, onClear, onPrev, onNext, onSaveNext, isFirst, isLast, canClear }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-ink-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-wrap gap-2">
        <Button variant="review" onClick={onMarkNext}>
          Mark for Review &amp; Next
        </Button>
        <Button variant="secondary" onClick={onClear} disabled={!canClear}>
          Clear Response
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onPrev} disabled={isFirst}>
          Previous
        </Button>
        <Button variant="secondary" onClick={onNext} disabled={isLast}>
          Next
        </Button>
        <Button variant="primary" onClick={onSaveNext}>
          Save &amp; Next
        </Button>
      </div>
    </div>
  );
}

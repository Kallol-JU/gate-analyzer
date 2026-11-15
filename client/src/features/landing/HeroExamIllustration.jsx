import StatusSwatch from '../exam/components/StatusSwatch.jsx';
import { PALETTE_STATUS as S } from '../exam/constants.js';

// A fixed arrangement of the five palette states. Purely illustrative.
const SAMPLE_PALETTE = [
  S.ANSWERED, S.ANSWERED, S.MARKED, S.NOT_ANSWERED, S.ANSWERED,
  S.ANSWERED_MARKED, S.ANSWERED, S.NOT_ANSWERED, S.NOT_ANSWERED, S.ANSWERED,
  S.MARKED, S.ANSWERED, S.NOT_VISITED, S.NOT_VISITED, S.NOT_VISITED,
  S.NOT_VISITED, S.NOT_VISITED, S.NOT_VISITED, S.NOT_VISITED, S.NOT_VISITED,
];

/**
 * Static illustration of the exam screen for the landing hero.
 * It is a picture, not a working screen, and is hidden from assistive technology.
 */
export default function HeroExamIllustration() {
  return (
    <figure aria-hidden="true" className="select-none">
      <div className="overflow-hidden rounded-lg border border-ink-300 bg-white">
        <div className="flex items-center justify-between border-b border-ink-200 px-4 py-2.5">
          <div className="h-2.5 w-36 rounded-full bg-ink-300" />
          <div className="rounded-md border border-ink-200 bg-ink-50 px-2.5 py-1 text-sm font-semibold tabular-nums text-ink-700">
            02:41:09
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto]">
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">MCQ</span>
              <span className="text-xs text-ink-500">2 marks</span>
            </div>
            <div className="space-y-2">
              <div className="h-2.5 w-full rounded-full bg-ink-200" />
              <div className="h-2.5 w-11/12 rounded-full bg-ink-200" />
              <div className="h-2.5 w-2/3 rounded-full bg-ink-200" />
            </div>
            <div className="space-y-2 pt-1">
              {[false, true, false, false].map((selected, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2.5 rounded-md border px-3 py-2 ${selected ? 'border-primary-600 bg-primary-50' : 'border-ink-200'}`}
                >
                  <span className={`size-3.5 rounded-full border ${selected ? 'border-primary-600 bg-primary-600' : 'border-ink-300'}`} />
                  <span className={`h-2 rounded-full ${selected ? 'w-28 bg-primary-200' : 'w-20 bg-ink-200'}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="w-44 border-l border-ink-200 bg-ink-50 p-3">
            <div className="mb-3 h-6 rounded-md bg-primary-600" />
            <div className="grid grid-cols-5 gap-x-1.5 gap-y-2">
              {SAMPLE_PALETTE.map((status, i) => (
                <StatusSwatch key={i} status={status} size="sm" className="mx-auto">
                  {i + 1}
                </StatusSwatch>
              ))}
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-2 text-xs text-ink-500">Illustration of the exam screen.</figcaption>
    </figure>
  );
}

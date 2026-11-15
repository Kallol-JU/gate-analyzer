import { cn } from '../../../utils/cn.js';
import { PALETTE_STATUS_LABEL, PALETTE_STATUS_ORDER } from '../constants.js';
import StatusSwatch from './StatusSwatch.jsx';

/**
 * Question palette: legend with live counts, then a numbered grid for the current section.
 * `questions` are the questions of the visible section, each with a global `number`.
 * `statuses` maps question id -> palette status.
 */
export default function Palette({ candidate, sectionName, questions, statuses, currentId, counts, onSelect }) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-3 border-b border-ink-200 pb-4">
        <span className="grid size-11 place-items-center rounded-full bg-ink-200 text-base font-semibold text-ink-700">
          {candidate.name.charAt(0)}
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-ink-900">{candidate.name}</p>
          <p className="text-xs text-ink-500">{candidate.rollNo}</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2" aria-label="Legend">
        {PALETTE_STATUS_ORDER.map((status) => (
          <li key={status} className="flex items-center gap-3 text-sm text-ink-700">
            <StatusSwatch status={status} size="sm">
              {counts[status]}
            </StatusSwatch>
            <span>{PALETTE_STATUS_LABEL[status]}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-5 rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white">{sectionName}</h3>

      <ol className="mt-4 grid grid-cols-5 gap-x-2 gap-y-3" aria-label={`Questions in ${sectionName}`}>
        {questions.map((q) => {
          const status = statuses[q.id];
          const current = q.id === currentId;
          return (
            <li key={q.id} className="flex justify-center">
              <button
                type="button"
                onClick={() => onSelect(q.id)}
                aria-label={`Question ${q.number}, ${PALETTE_STATUS_LABEL[status]}`}
                aria-current={current ? 'step' : undefined}
                className={cn('rounded-md p-0.5', current && 'ring-2 ring-primary-600 ring-offset-2')}
              >
                <StatusSwatch status={status}>{q.number}</StatusSwatch>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

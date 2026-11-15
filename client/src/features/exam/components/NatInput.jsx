import Icon from '../../../components/ui/Icon.jsx';
import { cn } from '../../../utils/cn.js';

const NUMBER_PATTERN = /^-?\d*\.?\d*$/;
const MAX_LENGTH = 16;

const keyClass =
  'h-11 rounded-md border border-ink-300 bg-white text-base font-medium text-ink-800 transition-colors hover:bg-ink-50 active:bg-ink-100';

/**
 * Numerical answer entry with an on-screen keypad (GATE gives candidates a virtual keypad).
 * Typing on a physical keyboard also works; input is filtered to a valid number shape.
 * `value` is a string such as "-12.5" so partial input like "-" or "3." can exist while typing.
 */
export default function NatInput({ value, onChange }) {
  const text = value ?? '';

  function update(next) {
    if (next.length > MAX_LENGTH) return;
    if (NUMBER_PATTERN.test(next)) onChange(next);
  }

  function press(char) {
    if (char === '.' && text.includes('.')) return;
    update(text + char);
  }

  function toggleSign() {
    update(text.startsWith('-') ? text.slice(1) : `-${text}`);
  }

  return (
    <div className="w-full max-w-xs">
      <label htmlFor="nat-answer" className="mb-1.5 block text-sm font-medium text-ink-800">
        Your answer
      </label>
      <input
        id="nat-answer"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        onChange={(e) => update(e.target.value)}
        placeholder="Enter a number"
        className="h-12 w-full rounded-md border border-ink-300 bg-white px-3 text-xl font-medium tabular-nums text-ink-900 placeholder:text-base placeholder:font-normal placeholder:text-ink-400 hover:border-ink-400 focus:border-primary-600"
      />

      <div className="mt-3 grid grid-cols-3 gap-2">
        {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((d) => (
          <button key={d} type="button" className={keyClass} onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <button type="button" className={keyClass} onClick={() => press('0')}>
          0
        </button>
        <button type="button" className={keyClass} onClick={() => press('.')} aria-label="Decimal point">
          .
        </button>
        <button type="button" className={keyClass} onClick={toggleSign} aria-label="Toggle minus sign">
          +/−
        </button>
        <button
          type="button"
          className={cn(keyClass, 'col-span-2 inline-flex items-center justify-center gap-2')}
          onClick={() => update(text.slice(0, -1))}
        >
          <Icon name="backspace" className="size-4" />
          Backspace
        </button>
        <button type="button" className={keyClass} onClick={() => onChange('')}>
          Clear
        </button>
      </div>
    </div>
  );
}

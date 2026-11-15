import { useId } from 'react';
import MathText from '../../../components/common/MathText.jsx';
import { cn } from '../../../utils/cn.js';

/**
 * MCQ renders radio buttons (value = "B"), MSQ renders checkboxes (value = ["A", "C"]).
 * Native inputs are used so keyboard and screen-reader behaviour is correct by default.
 */
export default function OptionList({ type, options, value, onChange, legend }) {
  const name = useId();
  const multiple = type === 'MSQ';
  const selected = multiple ? (Array.isArray(value) ? value : []) : value;

  function handleChange(key) {
    if (multiple) {
      onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key].sort());
    } else {
      onChange(key);
    }
  }

  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className="space-y-2.5">
        {options.map((opt) => {
          const checked = multiple ? selected.includes(opt.key) : selected === opt.key;
          return (
            <label
              key={opt.key}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 transition-colors',
                checked ? 'border-primary-600 bg-primary-50' : 'border-ink-200 bg-white hover:border-ink-400',
              )}
            >
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={name}
                checked={checked}
                onChange={() => handleChange(opt.key)}
                className="mt-1 size-4 shrink-0 accent-primary-600"
              />
              <span className="w-5 shrink-0 text-sm font-semibold text-ink-500">{opt.key}</span>
              <MathText className="min-w-0 text-base text-ink-900">{opt.text}</MathText>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

import { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn.js';

/** Native <select> styled like Input. `options`: [{ value, label }] */
const Select = forwardRef(function Select({ label, hint, error, options, placeholder, className, id, ...rest }, ref) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-ink-800">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        aria-invalid={error ? 'true' : undefined}
        className={cn(
          'h-10 w-full rounded-md border bg-white px-3 text-sm text-ink-900 transition-colors hover:border-ink-400 focus:border-primary-600 disabled:bg-ink-50 disabled:text-ink-500',
          error ? 'border-danger-600' : 'border-ink-300',
        )}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1.5 text-sm text-danger-700">{error}</p> : hint ? <p className="mt-1.5 text-sm text-ink-500">{hint}</p> : null}
    </div>
  );
});

export default Select;

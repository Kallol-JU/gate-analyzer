import { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn.js';

/** Multi-line input styled like Input. */
const Textarea = forwardRef(function Textarea({ label, hint, error, className, inputClassName, id, rows = 4, ...rest }, ref) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={className}>
      {label && <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-ink-800">{label}</label>}
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        className={cn('w-full rounded-md border bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 hover:border-ink-400 focus:border-primary-600', error ? 'border-danger-600' : 'border-ink-300', inputClassName)}
        {...rest}
      />
      {error ? <p className="mt-1.5 text-sm text-danger-700">{error}</p> : hint ? <p className="mt-1.5 text-sm text-ink-500">{hint}</p> : null}
    </div>
  );
});

export default Textarea;

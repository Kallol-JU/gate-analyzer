import { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn.js';

const Checkbox = forwardRef(function Checkbox({ label, description, className, id, ...rest }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded-xs border-ink-300 accent-primary-600"
        {...rest}
      />
      <label htmlFor={inputId} className="text-sm text-ink-800">
        {label}
        {description && <span className="mt-0.5 block text-ink-500">{description}</span>}
      </label>
    </div>
  );
});

export default Checkbox;

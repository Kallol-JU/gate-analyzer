import { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn.js';

/**
 * Labelled text input with optional hint and error.
 * `rightSlot` renders inside the field on the right (used for the show/hide password toggle).
 */
const Input = forwardRef(function Input(
  { label, hint, error, rightSlot, className, id, type = 'text', ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-800">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            'h-10 w-full rounded-md border bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400',
            'transition-colors hover:border-ink-400 focus:border-primary-600 disabled:bg-ink-50 disabled:text-ink-500',
            error ? 'border-danger-600' : 'border-ink-300',
            rightSlot && 'pr-11',
          )}
          {...rest}
        />
        {rightSlot && <div className="absolute inset-y-0 right-1 flex items-center">{rightSlot}</div>}
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-danger-700">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-sm text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default Input;

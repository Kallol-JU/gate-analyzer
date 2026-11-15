import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn.js';
import Spinner from './Spinner.jsx';

const base =
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors disabled:cursor-not-allowed';

const variants = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 disabled:bg-ink-200 disabled:text-ink-500',
  secondary:
    'border border-ink-300 bg-white text-ink-800 hover:border-ink-400 hover:bg-ink-50 disabled:border-ink-200 disabled:bg-ink-50 disabled:text-ink-400',
  review:
    'border border-st-marked bg-white text-st-marked hover:bg-st-marked/10 disabled:border-ink-200 disabled:text-ink-400',
  ghost: 'text-ink-700 hover:bg-ink-100 disabled:text-ink-400 disabled:hover:bg-transparent',
  danger: 'bg-danger-600 text-white hover:bg-danger-700 disabled:bg-ink-200 disabled:text-ink-500',
  // For dark backgrounds
  inverse: 'bg-white text-primary-800 hover:bg-primary-50 active:bg-primary-100',
  'outline-inverse': 'border border-white/40 text-white hover:bg-white/10',
};

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

/** Class string shared by <Button> and <LinkButton>. */
export function buttonStyles({ variant = 'primary', size = 'md', className } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={buttonStyles({ variant, size, className })}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});

/** A react-router <Link> that looks like a button. */
export function LinkButton({ to, variant = 'primary', size = 'md', className, children, ...rest }) {
  return (
    <Link to={to} className={buttonStyles({ variant, size, className })} {...rest}>
      {children}
    </Link>
  );
}

export default Button;

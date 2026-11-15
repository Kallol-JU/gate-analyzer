import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn.js';
import Icon from '../ui/Icon.jsx';

export const PROTOTYPE_LABEL = 'Prototype · Sample Data';

/**
 * Marks any screen whose content comes from client/src/prototype/.
 * `banner` is a full-width notice for pages; `strip` is the slim version for the exam screen.
 */
export default function PrototypeBanner({ variant = 'banner', children, backTo, backLabel, className }) {
  if (variant === 'strip') {
    return (
      <div className={cn('flex items-center justify-between gap-3 bg-warning-50 px-4 py-1.5 text-xs text-warning-700', className)}>
        <p>
          <span className="font-semibold">{PROTOTYPE_LABEL}</span>
          {children && <span className="ml-2">{children}</span>}
        </p>
        {backTo && (
          <Link to={backTo} className="shrink-0 font-medium underline underline-offset-2 hover:text-warning-600">
            {backLabel}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-start gap-3 rounded-lg border border-warning-600/30 bg-warning-50 px-4 py-3', className)}>
      <Icon name="info" className="mt-0.5 size-5 text-warning-700" />
      <div className="text-sm text-warning-700">
        <p className="font-semibold">{PROTOTYPE_LABEL}</p>
        {children && <p className="mt-0.5">{children}</p>}
      </div>
    </div>
  );
}

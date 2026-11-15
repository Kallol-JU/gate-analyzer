import { cn } from '../../utils/cn.js';

/** Flat surface with a hairline border. No shadow: hierarchy comes from spacing and type. */
export function Card({ className, children, as: Tag = 'section', ...rest }) {
  return (
    <Tag className={cn('rounded-lg border border-ink-200 bg-white', className)} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5', className)}>
      <div>
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export default Card;

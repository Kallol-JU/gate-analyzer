import { cn } from '../../utils/cn.js';
import Icon from './Icon.jsx';

export default function EmptyState({ icon = 'list', title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <span className="grid size-10 place-items-center rounded-full bg-ink-100 text-ink-500">
        <Icon name={icon} />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-ink-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

import { useRef } from 'react';
import { cn } from '../../utils/cn.js';

/**
 * Controlled tab strip. Renders only the tab buttons; the parent decides what
 * content to show for `value`. Supports left/right arrow keys.
 * `tabs`: [{ id, label, count? }]
 */
export default function Tabs({ tabs, value, onChange, label = 'Sections', className }) {
  const refs = useRef({});

  function onKeyDown(e, index) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = tabs[(index + dir + tabs.length) % tabs.length];
    onChange(next.id);
    refs.current[next.id]?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className={cn('flex gap-1', className)}>
      {tabs.map((tab, i) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => (refs.current[tab.id] = el)}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              active ? 'bg-primary-600 text-white' : 'text-ink-700 hover:bg-ink-100',
            )}
          >
            {tab.label}
            {tab.count != null && (
              <span className={cn('ml-2 text-xs', active ? 'text-primary-100' : 'text-ink-500')}>{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

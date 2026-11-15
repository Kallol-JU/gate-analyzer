import { useEffect, useRef } from 'react';
import { cn } from '../../utils/cn.js';
import Icon from './Icon.jsx';

const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

/**
 * Accessible modal built on the native <dialog> element, which provides the focus trap,
 * Esc to close and inert background for free. Content renders only while open.
 */
export default function Modal({ open, onClose, title, description, children, footer, size = 'md', className }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // The inner wrapper fills the dialog, so a click on <dialog> itself is a backdrop click.
        if (e.target === ref.current) onClose?.();
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-lg bg-white p-0 text-ink-900 backdrop:bg-ink-900/50',
        sizes[size],
        className,
      )}
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold">{title}</h2>
              {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="-mr-1 rounded-md p-1 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
            >
              <Icon name="x" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-ink-200 px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

import { useUiStore } from '../../store/uiStore.js';
import { cn } from '../../utils/cn.js';
import Icon from './Icon.jsx';

const accent = {
  neutral: 'border-l-ink-400',
  success: 'border-l-success-600',
  danger: 'border-l-danger-600',
  warning: 'border-l-warning-600',
  primary: 'border-l-primary-600',
};

/** Mount once near the app root. Toasts are created with useUiStore().addToast(...). */
export default function ToastViewport() {
  const toasts = useUiStore((s) => s.toasts);
  const removeToast = useUiStore((s) => s.removeToast);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border border-l-4 border-ink-200 bg-white p-3 pr-2 sm:w-96',
            accent[t.tone],
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-900">{t.title}</p>
            {t.message && <p className="mt-0.5 text-sm text-ink-600">{t.message}</p>}
          </div>
          <button
            type="button"
            onClick={() => removeToast(t.id)}
            aria-label="Dismiss notification"
            className="rounded-md p-1 text-ink-500 hover:bg-ink-100"
          >
            <Icon name="x" className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

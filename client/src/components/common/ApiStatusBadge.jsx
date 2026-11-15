import { useHealthCheck } from '../../hooks/useHealthCheck.js';
import { formatUptime } from '../../utils/formatTime.js';
import { cn } from '../../utils/cn.js';

const DOT = {
  degraded: 'bg-warning-600',
  checking: 'bg-ink-400',
  online: 'bg-success-600',
  offline: 'bg-danger-600',
};

const TEXT = {
  degraded: 'API connected, database offline',
  checking: 'Checking API…',
  online: 'API connected',
  offline: 'API unreachable',
};

/**
 * Real connection status: calls GET /api/v1/health and shows the result.
 * `detailed` also lists what the endpoint returned.
 */
export default function ApiStatusBadge({ className, detailed = false }) {
  const { status, data, error, checkedAt, recheck } = useHealthCheck();

  // The API answers but reports MongoDB as not connected.
  const shown = status === 'online' && data.status === 'degraded' ? 'degraded' : status;

  const tooltip =
    status === 'online' ? `${data.service} v${data.version}` : status === 'offline' ? error : 'Contacting /api/v1/health';

  return (
    <div className={className}>
      <div className="inline-flex items-center gap-2 text-sm text-ink-600" title={tooltip}>
        <span className={cn('size-2 rounded-full', DOT[shown])} aria-hidden="true" />
        <span role="status">{TEXT[shown]}</span>
        {status === 'offline' && (
          <button
            type="button"
            onClick={recheck}
            className="font-medium text-primary-700 underline-offset-2 hover:underline"
          >
            Retry
          </button>
        )}
      </div>

      {detailed && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {status === 'online' ? (
            <>
              <dt className="text-ink-500">Service</dt>
              <dd>{data.service}</dd>
              <dt className="text-ink-500">Version</dt>
              <dd>{data.version}</dd>
              <dt className="text-ink-500">Environment</dt>
              <dd>{data.environment}</dd>
              <dt className="text-ink-500">Uptime</dt>
              <dd>{formatUptime(data.uptimeSeconds)}</dd>
              <dt className="text-ink-500">Database</dt>
              <dd>{data.database.status}</dd>
            </>
          ) : (
            <>
              <dt className="text-ink-500">Status</dt>
              <dd>{status === 'offline' ? error : 'Waiting for a response'}</dd>
            </>
          )}
          {checkedAt && (
            <>
              <dt className="text-ink-500">Last checked</dt>
              <dd>{checkedAt.toLocaleTimeString()}</dd>
            </>
          )}
        </dl>
      )}
    </div>
  );
}

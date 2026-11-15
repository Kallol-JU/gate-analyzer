import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchHealth } from '../api/health.api.js';
import { describeApiError } from '../utils/errorMessage.js';

/**
 * Calls GET /api/v1/health on mount and then every `intervalMs`.
 * status: 'checking' | 'online' | 'offline'
 */
export function useHealthCheck({ intervalMs = 30_000 } = {}) {
  const [state, setState] = useState({ status: 'checking', data: null, error: null, checkedAt: null });
  const mounted = useRef(true);

  const check = useCallback(async () => {
    try {
      const data = await fetchHealth();
      if (mounted.current) setState({ status: 'online', data, error: null, checkedAt: new Date() });
    } catch (err) {
      if (mounted.current) {
        setState({ status: 'offline', data: null, error: describeApiError(err), checkedAt: new Date() });
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    check();
    const id = setInterval(check, intervalMs);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [check, intervalMs]);

  return { ...state, recheck: check };
}

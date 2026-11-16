import { useCallback, useEffect, useRef, useState } from 'react';
import { describeApiError } from '../utils/errorMessage.js';

/** Runs an async loader on mount and whenever `deps` change. Returns { data, error, loading, reload }. */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const run = useRef(0);

  const load = useCallback(async () => {
    const id = ++run.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loader();
      if (id === run.current) setState({ data, error: null, loading: false });
    } catch (err) {
      if (id === run.current) setState({ data: null, error: describeApiError(err), loading: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
    return () => {
      run.current += 1;
    };
  }, [load]);

  return { ...state, reload: load };
}

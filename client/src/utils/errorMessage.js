/** Turns an Axios error into a short message a person can act on. */
export function describeApiError(err) {
  if (err?.response) {
    const { status, data } = err.response;
    // Our API always answers errors with { success: false, error: { message } }.
    if (data?.error?.message) return data.error.message;
    // In development, Vite's proxy answers 500/502/503/504 when Express is not running.
    if ([500, 502, 503, 504].includes(status)) return 'Cannot reach the API server. Is it running?';
    return `The server responded with status ${status}.`;
  }
  if (err?.code === 'ECONNABORTED') return 'The server took too long to respond.';
  return 'Cannot reach the API server. Is it running?';
}

/** Server validation details [{ path, message }] -> { path: message } for showing under inputs. */
export function getFieldErrors(err) {
  const details = err?.response?.data?.error?.details;
  if (!Array.isArray(details)) return {};
  return Object.fromEntries(details.map((d) => [d.path, d.message]));
}

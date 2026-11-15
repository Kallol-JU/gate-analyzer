import { Component } from 'react';

/** Last-resort boundary for render errors outside the router. Route errors use RouteError. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-dvh place-items-center bg-ink-50 p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-ink-900">Something broke on this page</h1>
          <p className="mt-2 text-sm text-ink-600">Reload the page to try again. If it keeps happening, tell us what you were doing.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 h-10 rounded-md bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

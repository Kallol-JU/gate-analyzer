import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { buttonStyles } from '../ui/Button.jsx';

/** errorElement for the router: shown when a route throws while rendering or loading. */
export default function RouteError() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <div className="grid min-h-dvh place-items-center bg-ink-50 p-6">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-ink-900">{notFound ? 'Page not found' : 'This page failed to load'}</h1>
        <p className="mt-2 text-sm text-ink-600">
          {notFound ? 'The address may be mistyped, or the page may have moved.' : 'Go back to the home page and try again.'}
        </p>
        <Link to="/" className={buttonStyles({ className: 'mt-5' })}>
          Back to home
        </Link>
      </div>
    </div>
  );
}

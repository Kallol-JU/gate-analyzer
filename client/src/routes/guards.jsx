import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { useAuthStore } from '../store/authStore.js';

function FullPageSpinner() {
  return (
    <div className="grid min-h-dvh place-items-center bg-ink-50">
      <Spinner className="size-6 text-primary-600" label="Checking your session" />
    </div>
  );
}

/** Pages that need a logged-in user. Sends visitors to /login and brings them back afterwards. */
export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status);
  const retry = useAuthStore((s) => s.retry);
  const location = useLocation();

  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'unavailable') {
    return (
      <div className="grid min-h-dvh place-items-center bg-ink-50 p-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-lg font-semibold text-ink-900">Cannot reach the server</h1>
          <p className="mt-2 text-sm text-ink-600">We could not check your login. Make sure the API is running, then try again.</p>
          <Button className="mt-5" onClick={retry}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Login and register pages: logged-in users are sent on to where they were headed. */
export function GuestRoute() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'authenticated') return <Navigate to={location.state?.from?.pathname ?? '/dashboard'} replace />;
  return <Outlet />;
}

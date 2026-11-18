import { Link, NavLink, Outlet } from 'react-router-dom';
import Logo from '../components/ui/Logo.jsx';
import { LinkButton } from '../components/ui/Button.jsx';
import ApiStatusBadge from '../components/common/ApiStatusBadge.jsx';
import { useAuthStore } from '../store/authStore.js';
import { cn } from '../utils/cn.js';

const navLink = ({ isActive }) =>
  cn(
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'text-primary-700' : 'text-ink-600 hover:text-ink-900',
  );

export default function PublicLayout() {
  const status = useAuthStore((s) => s.status);

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="Home" className="rounded-md">
            <Logo />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            <NavLink to="/tests" className={navLink}>
              Tests
            </NavLink>
            <NavLink to="/history" className={navLink}>
              My attempts
            </NavLink>
          </nav>

          <div className="flex min-h-8 items-center gap-2">
            {status === 'authenticated' ? (
              <LinkButton to="/dashboard" size="sm">
                Go to dashboard
              </LinkButton>
            ) : status !== 'loading' ? (
              <>
                <LinkButton to="/login" variant="ghost" size="sm">
                  Log in
                </LinkButton>
                <LinkButton to="/register" size="sm">
                  Create account
                </LinkButton>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-ink-200 bg-ink-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ink-600 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Logo className="text-base text-ink-900" />
            <p className="mt-2 max-w-md">
              An independent practice platform. Not affiliated with or endorsed by the institutes that organise GATE.
            </p>
          </div>
          <ApiStatusBadge />
        </div>
        <div className="border-t border-ink-200">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-ink-500 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; 2026 PrepGate. All rights reserved.</p>
            <p>
              Built with care by{' '}
              <a
                href="https://kall0l.me"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm font-medium text-ink-600 underline-offset-2 transition-colors hover:text-primary-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                Kallol
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

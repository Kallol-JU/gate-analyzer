import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import Logo from '../components/ui/Logo.jsx';
import Icon from '../components/ui/Icon.jsx';
import Badge from '../components/ui/Badge.jsx';
import ApiStatusBadge from '../components/common/ApiStatusBadge.jsx';
import { useAuthStore } from '../store/authStore.js';
import { cn } from '../utils/cn.js';
import { NAV_ITEMS } from './navConfig.js';

const itemBase = 'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors';

function SidebarNav({ onNavigate }) {
  return (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {NAV_ITEMS.map((item) =>
        item.to ? (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === '/dashboard'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(itemBase, isActive ? 'bg-primary-50 text-primary-700' : 'text-ink-700 hover:bg-ink-100')
            }
          >
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ) : (
          <div key={item.label} aria-disabled="true" className={cn(itemBase, 'cursor-not-allowed text-ink-400')}>
            <Icon name={item.icon} />
            <span className="flex-1">{item.label}</span>
            <Badge>Soon</Badge>
          </div>
        ),
      )}
    </nav>
  );
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function DashboardLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Esc closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className="min-h-dvh bg-ink-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-ink-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-ink-200 px-5">
          <Link to="/" aria-label="Home" className="rounded-md">
            <Logo />
          </Link>
        </div>
        <SidebarNav />
        <div className="border-t border-ink-200 px-5 py-4">
          <ApiStatusBadge />
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-ink-900/50"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-white">
            <div className="flex h-16 items-center justify-between border-b border-ink-200 px-5">
              <Logo />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1 text-ink-600 hover:bg-ink-100"
              >
                <Icon name="x" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setDrawerOpen(false)} />
            <div className="border-t border-ink-200 px-5 py-4">
              <ApiStatusBadge />
            </div>
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-ink-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="-ml-2 rounded-md p-2 text-ink-700 hover:bg-ink-100 lg:hidden"
          >
            <Icon name="menu" />
          </button>
          <span className="hidden text-sm font-medium text-ink-500 lg:block">Student dashboard</span>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium text-ink-900">{user.name}</p>
              <p className="text-xs text-ink-500">{user.role === 'admin' ? 'Administrator' : 'Student'}</p>
            </div>
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700"
            >
              {initials(user.name)}
            </span>
            <Button variant="secondary" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { Link, Outlet } from 'react-router-dom';
import Logo from '../components/ui/Logo.jsx';
import Icon from '../components/ui/Icon.jsx';

const BENEFITS = [
  'Every attempt is saved, so you can review it later.',
  'Subject-wise and topic-wise breakdowns show where marks are lost.',
  'Leaderboards are optional. You can practise privately.',
];

/** Split screen: a short reminder of what an account is for, and the form on the right. */
export default function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between bg-primary-900 p-10 text-white lg:flex">
        <Link to="/" aria-label="Home" className="w-fit rounded-md">
          <Logo />
        </Link>

        <div className="max-w-sm">
          <h2 className="font-serif text-3xl font-semibold leading-snug">Practise the way you will be tested.</h2>
          <ul className="mt-8 space-y-4">
            {BENEFITS.map((text) => (
              <li key={text} className="flex gap-3 text-primary-100">
                <Icon name="check" className="mt-0.5 size-5 text-st-answered" strokeWidth={2.5} />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-primary-200">Free for every student.</p>
      </aside>

      <div className="flex flex-col bg-white">
        <div className="flex items-center justify-between px-6 py-5 lg:justify-end">
          <Link to="/" aria-label="Home" className="rounded-md lg:hidden">
            <Logo />
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900">
            <Icon name="arrow-left" className="size-4" />
            Back to home
          </Link>
        </div>
        <main className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

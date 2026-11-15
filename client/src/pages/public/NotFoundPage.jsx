import { LinkButton } from '../../components/ui/Button.jsx';

export default function NotFoundPage() {
  return (
    <div className="mx-auto grid max-w-md place-items-center px-6 py-24 text-center">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-ink-900">Page not found</h1>
        <p className="mt-2 text-ink-600">The address may be mistyped, or the page may have moved.</p>
        <LinkButton to="/" className="mt-6">
          Back to home
        </LinkButton>
      </div>
    </div>
  );
}

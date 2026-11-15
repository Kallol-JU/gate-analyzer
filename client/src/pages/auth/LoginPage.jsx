import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Input from '../../components/ui/Input.jsx';
import { useAuthStore } from '../../store/authStore.js';
import { describeApiError, getFieldErrors } from '../../utils/errorMessage.js';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

/** Real login. On success GuestRoute sends the user to the page they came from, or /dashboard. */
export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!EMAIL_PATTERN.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (!form.password) next.password = 'Enter your password.';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await login({ email: form.email.trim(), password: form.password });
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(describeApiError(err));
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold text-ink-900">Log in</h1>
      <p className="mt-2 text-ink-600">Welcome back. Pick up where your last attempt ended.</p>

      {formError && (
        <div role="alert" className="mt-6 flex items-start gap-3 rounded-md bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <Icon name="alert" className="mt-0.5 size-4" />
          <p>{formError}</p>
        </div>
      )}

      <form className="mt-6 space-y-5" onSubmit={onSubmit} noValidate>
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
        />
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          name="password"
          autoComplete="current-password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="rounded-md p-2 text-ink-500 hover:text-ink-800"
            >
              <Icon name={showPassword ? 'eye-off' : 'eye'} className="size-4" />
            </button>
          }
        />
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Log in
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-600">
        New here?{' '}
        <Link to="/register" className="font-medium text-primary-700 hover:underline">
          Create a free account
        </Link>
      </p>
    </div>
  );
}

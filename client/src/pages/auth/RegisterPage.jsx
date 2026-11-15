import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Input from '../../components/ui/Input.jsx';
import { useAuthStore } from '../../store/authStore.js';
import { describeApiError, getFieldErrors } from '../../utils/errorMessage.js';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

// Mirrors the server's password rule (server/src/modules/auth/auth.schema.js). The server is the authority.
function passwordProblem(pw) {
  if (pw.length < 8) return 'Use at least 8 characters.';
  if (pw.length > 72) return 'Use at most 72 characters.';
  if (!/[A-Za-z]/.test(pw)) return 'Include at least one letter.';
  if (!/\d/.test(pw)) return 'Include at least one number.';
  return '';
}

/** Real registration. Public sign-up always creates a student account. */
export default function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const [form, setForm] = useState({ name: '', email: '', password: '', showOnLeaderboard: true });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter your name.';
    if (!EMAIL_PATTERN.test(form.email.trim())) next.email = 'Enter a valid email address.';
    const pwError = passwordProblem(form.password);
    if (pwError) next.password = pwError;
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        showOnLeaderboard: form.showOnLeaderboard,
      });
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      setErrors(err.response?.data?.error?.code === 'EMAIL_TAKEN' ? { email: describeApiError(err) } : fieldErrors);
      if (!Object.keys(fieldErrors).length && err.response?.data?.error?.code !== 'EMAIL_TAKEN') setFormError(describeApiError(err));
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold text-ink-900">Create your account</h1>
      <p className="mt-2 text-ink-600">Free for every student. No payment details needed.</p>

      {formError && (
        <div role="alert" className="mt-6 flex items-start gap-3 rounded-md bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <Icon name="alert" className="mt-0.5 size-4" />
          <p>{formError}</p>
        </div>
      )}

      <form className="mt-6 space-y-5" onSubmit={onSubmit} noValidate>
        <Input label="Full name" name="name" autoComplete="name" placeholder="Your name" value={form.name} onChange={set('name')} error={errors.name} />
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
          autoComplete="new-password"
          hint="At least 8 characters, with a letter and a number."
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
        <Checkbox
          label="Show my name on leaderboards"
          description="You can change this later. Private practice never appears on a leaderboard."
          checked={form.showOnLeaderboard}
          onChange={(e) => setForm((f) => ({ ...f, showOnLeaderboard: e.target.checked }))}
        />
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-600">
        Already registered?{' '}
        <Link to="/login" className="font-medium text-primary-700 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

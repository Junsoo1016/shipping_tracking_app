import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './LoginPage.module.css';

const LoginPage = () => {
  const { signIn, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      setSubmitting(false);
      return;
    }

    try {
      if (mode === 'signin') {
        await signIn(email, password);
        setSuccess('Signed in successfully.');
      } else {
        await register(email, password);
        setSuccess('Account created successfully.');
      }
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      setError('Authentication failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1>ShipTrack</h1>
        <p className={styles.subtitle}>Log in to manage your ocean freight tracking.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              required
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </label>

          {mode === 'signup' && (
            <label>
              Confirm Password
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={event => setConfirmPassword(event.target.value)}
                placeholder="Confirm password"
              />
            </label>
          )}

          {error && <div className={styles.error}>{error}</div>}
          {success && (
            <div className={styles.success}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M14 7.333c0 3.22-2.613 5.834-5.833 5.834A5.834 5.834 0 0 1 2.333 7.333 5.834 5.834 0 0 1 8.167 1.5 5.834 5.834 0 0 1 14 7.333Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="m6.333 7.333 1.334 1.334 2.667-2.667"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{success}</span>
            </div>
          )}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className={styles.toggle}>
          {mode === 'signin' ? (
            <>
              <span>Don&apos;t have an account?</span>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  setSuccess(null);
                  setConfirmPassword('');
                }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              <span>Already registered?</span>
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setSuccess(null);
                  setConfirmPassword('');
                }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';

export default function LoginView() {
  const { authenticate, error } = useAuth();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const registering = mode === 'register';

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await authenticate(mode, { username, password });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <main className="view auth-view">
        <h1 className="title">Budgeteer</h1>
        <h2>{registering ? 'Create an account' : 'Sign in'}</h2>
        {error && <p className="error-banner" role="alert">{error}</p>}
        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="username">Username</label>
          <input id="username" autoComplete="username" required minLength={3} maxLength={64}
            pattern="[a-zA-Z0-9_.\-]+" value={username}
            onChange={(event) => setUsername(event.target.value)} disabled={busy} />
          <p className="auth-hint">3-64 letters, numbers, dots, underscores or hyphens.</p>
          <label htmlFor="password">Password</label>
          <input id="password" type="password"
            autoComplete={registering ? 'new-password' : 'current-password'}
            required minLength={registering ? 12 : 1} value={password}
            onChange={(event) => setPassword(event.target.value)} disabled={busy} />
          {registering && <p className="auth-hint">Use at least 12 characters.</p>}
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? 'Please wait...' : registering ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <button className="link-button" type="button" disabled={busy} onClick={() => {
          setMode(registering ? 'login' : 'register');
          setPassword('');
        }}>
          {registering ? 'Already have an account? Sign in' : 'Create an account'}
        </button>
      </main>
    </div>
  );
}

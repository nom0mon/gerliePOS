import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';

type Mode = 'signin' | 'signup';

/**
 * Cloud account screen. Signing in links this device to a cloud business so its
 * data can sync (sync itself lands in a later task). The app remains fully
 * usable without signing in — this screen is optional, reachable from the admin
 * menu. New sign-ups are prompted to name their business (bootstrap).
 */
export default function AuthPage() {
  const { cloudEnabled, signedIn, membership, signIn, signUp, signOut, createBusiness } =
    useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!cloudEnabled) {
    return (
      <section>
        <h1 className="page-title">Account</h1>
        <p className="muted">
          Cloud accounts are not configured on this device. The app is running
          in local-only mode — everything works offline and stays on this
          device.
        </p>
      </section>
    );
  }

  if (signedIn) {
    return (
      <section>
        <h1 className="page-title">Account</h1>
        <div className="card">
          <div className="muted" style={{ fontSize: '0.85rem' }}>
            Signed in
          </div>
          <div style={{ fontWeight: 700, marginTop: 2 }}>
            {membership
              ? `${membership.businessName} · ${membership.role}`
              : 'No business yet'}
          </div>
        </div>

        {!membership && (
          <form
            onSubmit={async (e: FormEvent) => {
              e.preventDefault();
              setError(null);
              if (!businessName.trim()) return setError('Business name is required.');
              setBusy(true);
              try {
                await createBusiness(businessName);
                setInfo('Business created.');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not create business.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="section-label">Create your business</div>
            <div className="field">
              <label htmlFor="biz-name">Business name</label>
              <input
                id="biz-name"
                className="input"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Kaffi's Corner"
                autoFocus
              />
            </div>
            {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
            {info && <p className="muted">{info}</p>}
            <button type="submit" className="btn" disabled={busy}>
              <Icon name="plus" size={20} />
              Create business
            </button>
          </form>
        )}

        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginTop: 16 }}
          onClick={async () => {
            await signOut();
            navigate('/');
          }}
        >
          Sign out
        </button>
      </section>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim() || !password) {
      return setError('Email and password are required.');
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signUp(email.trim(), password);
        setInfo('Account created. You can now sign in and create your business.');
        setMode('signin');
      } else {
        await signIn(email.trim(), password);
        navigate('/account');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h1 className="page-title">{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Signing in links this device to your cloud business. The app also works
        fully offline without an account.
      </p>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            className="input"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p style={{ color: 'var(--color-danger)' }} role="alert">{error}</p>}
        {info && <p className="muted">{info}</p>}
        <button type="submit" className="btn" disabled={busy}>
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ marginTop: 12 }}
        onClick={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin');
          setError(null);
          setInfo(null);
        }}
      >
        {mode === 'signin'
          ? 'Need an account? Create one'
          : 'Have an account? Sign in'}
      </button>
    </section>
  );
}

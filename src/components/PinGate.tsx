import { useState } from 'react';
import Sheet from './Sheet';
import { ADMIN_PIN } from '../config/admin';

/**
 * PIN prompt shown before the admin sidebar opens. A soft lock to prevent a
 * cashier from accidentally voiding sales or editing prices — not real security
 * (the app is frontend-only).
 */
export default function PinGate({
  onUnlock,
  onCancel,
}: {
  onUnlock: () => void;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      onUnlock();
    } else {
      setError(true);
      setPin('');
    }
  }

  return (
    <Sheet title="Enter admin PIN" onClose={onCancel}>
      <p className="muted" style={{ marginTop: 0 }}>
        Managing products and transactions is PIN-protected.
      </p>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="admin-pin">PIN</label>
          <input
            id="admin-pin"
            className="input"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError(false);
            }}
            placeholder="••••"
          />
        </div>
        {error && (
          <p style={{ color: 'var(--color-danger)', marginTop: 0 }} role="alert">
            Incorrect PIN. Try again.
          </p>
        )}
        <button type="submit" className="btn" disabled={pin.length === 0}>
          Unlock
        </button>
      </form>
    </Sheet>
  );
}

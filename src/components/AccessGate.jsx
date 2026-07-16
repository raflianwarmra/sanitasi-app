import { useState, useEffect, useRef } from 'react';
import { isUnlocked, unlock, msUntilExpiry } from '../lib/accessGate';
import Icon from './Icon';

// Blocks the whole app behind a shared access code. Access lasts an absolute
// 30 minutes from entry, then this re-locks even during an active session.

export default function AccessGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => isUnlocked());
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const timerRef = useRef(null);

  // Re-lock exactly at expiry. Browsers throttle timers in background tabs,
  // so also re-check whenever the tab returns to the foreground.
  useEffect(() => {
    if (!unlocked) return undefined;
    const schedule = () => {
      clearTimeout(timerRef.current);
      const ms = msUntilExpiry();
      if (ms <= 0) { setUnlocked(false); return; }
      timerRef.current = setTimeout(() => setUnlocked(false), ms);
    };
    schedule();
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (isUnlocked()) schedule();
      else setUnlocked(false);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [unlocked]);

  if (unlocked) return children;

  const submit = (e) => {
    e.preventDefault();
    if (unlock(code.trim())) {
      setCode('');
      setError(false);
      setUnlocked(true);
    } else {
      setError(true);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'grid', placeItems: 'center',
      padding: 20, background: 'var(--bg)',
    }}>
      <form
        onSubmit={submit}
        className="card fade-in"
        style={{ width: 'min(380px, 100%)', padding: 28, textAlign: 'center' }}
      >
        <span style={{
          width: 44, height: 44, borderRadius: 11, margin: '0 auto 14px',
          background: 'var(--accent)', color: 'var(--accent-contrast)',
          display: 'grid', placeItems: 'center',
        }}>
          <Icon name="droplet" size={22} strokeWidth={2} />
        </span>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>
          Dashboard Data Sanitasi
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 20px' }}>
          Masukkan kode akses untuk membuka dashboard.
        </p>

        <label htmlFor="access-code" className="field-label" style={{ textAlign: 'left' }}>
          Kode akses
        </label>
        <input
          id="access-code"
          className="input"
          type="password"
          autoFocus
          autoComplete="off"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(false); }}
          placeholder="••••••••"
          aria-invalid={error}
          aria-describedby={error ? 'access-error' : undefined}
          style={{ marginBottom: error ? 8 : 16 }}
        />
        {error && (
          <div id="access-error" role="alert" style={{
            fontSize: 12, color: 'var(--bad)', textAlign: 'left', marginBottom: 16,
          }}>
            Kode akses salah. Coba lagi.
          </div>
        )}
        <button type="submit" className="btn btn-accent" style={{ width: '100%' }}>
          Buka Dashboard
        </button>
        <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: '16px 0 0' }}>
          Sesi berlaku 30 menit, lalu kode perlu dimasukkan kembali.
        </p>
      </form>
    </div>
  );
}

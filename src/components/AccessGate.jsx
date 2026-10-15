import { useState, useEffect, useRef } from 'react';
import { isUnlocked, unlock, msUntilExpiry } from '../lib/accessGate';
import Icon from './Icon';

// Blocks the whole app behind a shared access code. Access lasts an absolute
// 30 minutes from entry, then this re-locks even during an active session.

export default function AccessGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => isUnlocked());
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);
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

  const submit = async (e) => {
    e.preventDefault();
    if (checking) return;
    setChecking(true);
    try {
      if (await unlock(code.trim())) {
        setCode('');
        setError(null);
        setUnlocked(true);
      } else {
        setError('Kode akses salah. Coba lagi.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="gate">
      <form onSubmit={submit} className="card gate-card materialize">
        <span className="app-mark app-mark-lg" aria-hidden="true">
          <Icon name="droplet" size={22} strokeWidth={2} />
        </span>
        <h1 className="text-title" style={{ margin: '0 0 6px' }}>Dashboard Data Sanitasi</h1>
        <p className="text-body" style={{ color: 'var(--ink-2)', margin: '0 0 22px' }}>
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
          onChange={(e) => { setCode(e.target.value); setError(null); }}
          aria-invalid={!!error}
          aria-describedby={error ? 'access-error' : undefined}
          style={{ marginBottom: error ? 8 : 16 }}
        />
        {error && (
          <div id="access-error" role="alert" className="text-caption" style={{ color: 'var(--bad)', textAlign: 'left', marginBottom: 16 }}>
            {error}
          </div>
        )}
        <button type="submit" className="btn btn-accent" style={{ width: '100%' }} disabled={checking || !code.trim()}>
          {checking ? 'Memeriksa…' : 'Buka Dashboard'}
        </button>
        <p className="text-caption" style={{ margin: '16px 0 0' }}>
          Sesi berlaku 30 menit, lalu kode perlu dimasukkan kembali.
        </p>
      </form>
    </div>
  );
}

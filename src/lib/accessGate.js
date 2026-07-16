// Soft client-side access gate. NOT real authentication — the code ships in
// the bundle and is bypassable via devtools; it only keeps casual visitors
// out. Access is granted for an ABSOLUTE 30-minute window from entry, after
// which the code must be re-entered even during an active session.

export const ACCESS_CODE = 'timsan123';
export const SESSION_MS = 30 * 60 * 1000; // 30 minutes

const KEY = 'sanitasi_access_until';

// Absolute expiry timestamp (epoch ms), or 0 if none/unreadable.
function expiryAt() {
  try {
    const v = Number(localStorage.getItem(KEY));
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

export function isUnlocked() {
  return expiryAt() > Date.now();
}

// Milliseconds until the current session expires (<= 0 if already locked).
export function msUntilExpiry() {
  return expiryAt() - Date.now();
}

// Returns true if the code is correct and access was granted.
export function unlock(code) {
  if (code !== ACCESS_CODE) return false;
  try {
    localStorage.setItem(KEY, String(Date.now() + SESSION_MS));
  } catch {
    /* localStorage unavailable — gate falls back to per-render (still blocks) */
  }
  return true;
}

export function lock() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

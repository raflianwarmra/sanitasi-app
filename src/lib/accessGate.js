// Soft client-side access gate. NOT real authentication: the app is a static
// site and reads a link-shared Google Sheet, so anyone who has the sheet URL
// or edits localStorage can see the data. The gate only keeps casual visitors
// out. Access lasts an ABSOLUTE 30-minute window from entry.
//
// Only the SHA-256 hash of the code ships (no plaintext in source or bundle).
// To rotate the code without a code change, set the repository secret
// VITE_ACCESS_CODE_SHA256 to the new hash:
//   printf '%s' 'kode-baru' | sha256sum
// The default below is the hash of the code the team already uses.

const DEFAULT_SHA256 = '4d0d286ae059c5a6768e49f2d319833982f8d9760403ebe7b9279fe09fa1b2df';
const CODE_SHA256 = (import.meta.env.VITE_ACCESS_CODE_SHA256 || DEFAULT_SHA256).trim().toLowerCase();
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

async function sha256Hex(text) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Browser tidak mendukung verifikasi kode. Buka dashboard melalui HTTPS.');
  }
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Resolves true if the code is correct and access was granted.
export async function unlock(code) {
  if ((await sha256Hex(code)) !== CODE_SHA256) return false;
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

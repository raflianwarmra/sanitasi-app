// Tiny localStorage helpers for remembering a user's last selections across
// navigation (pages fully unmount on hash change, so React state is lost).
// Survives browser restart. Fails silently when storage is unavailable.

export function loadPref(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function savePref(key, value) {
  try {
    if (value == null || value === '') localStorage.removeItem(key);
    else localStorage.setItem(key, String(value));
  } catch {
    /* storage unavailable — selection simply won't persist */
  }
}

// Completion / error feedback for meaningful actions (export done, note
// saved). A tiny pub-sub so any module can confirm an action; <Toaster />
// renders them in one polite live region.

const listeners = new Set();
let seq = 0;

export function toast(message, { tone = 'ok', detail } = {}) {
  const t = { id: ++seq, message, tone, detail };
  listeners.forEach((fn) => fn(t));
}

export function subscribeToasts(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

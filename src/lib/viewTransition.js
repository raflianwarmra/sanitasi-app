import { flushSync } from 'react-dom';

// Seamless state changes: the browser snapshots the old view, React renders
// the new one synchronously, and CSS (::view-transition-*) blends them —
// the nav stays put, the page title morphs, content cross-fades. Falls back
// to an instant update where the API is unavailable.
export function withViewTransition(update) {
  if (typeof document === 'undefined' || !document.startViewTransition) {
    update();
    return;
  }
  document.startViewTransition(() => { flushSync(update); });
}

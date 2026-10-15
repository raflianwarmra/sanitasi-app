import { useEffect, useRef, useState } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Keeps an overlay mounted through its exit transition so it can leave the
// way it came. Entry runs from CSS @starting-style; `state` drives
// data-state="open|closed". Re-opening mid-exit simply retargets the CSS
// transition from its current value (interruptible).
export function usePresence(open, exitMs = 400) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    if (open || !mounted) return undefined;
    const t = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(t);
  }, [open, mounted, exitMs]);
  return { mounted, state: open ? 'open' : 'closed' };
}

// Modal focus management: move focus in, trap Tab, close on Escape, lock page
// scroll, and return focus to the trigger on close.
export function useFocusTrap(ref, active, onClose) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (!active) return undefined;
    const node = ref.current;
    const previous = document.activeElement;
    const target = node?.querySelector('[data-autofocus]') ?? node?.querySelector(FOCUSABLE) ?? node;
    target?.focus({ preventScroll: true });

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !node) return;
      const items = [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (previous && typeof previous.focus === 'function') previous.focus({ preventScroll: true });
    };
  }, [active, ref]);
}

// Keyboard + pointer activation props for a clickable table row. Keeps the
// native row role so screen readers still announce the cells.
export function rowLinkProps(onActivate) {
  return {
    className: 'row-link',
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(); }
    },
  };
}

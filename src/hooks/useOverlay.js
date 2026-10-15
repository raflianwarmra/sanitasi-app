import { useEffect, useRef, useState } from 'react';
import { animateSpring, project, rubberband, SPRINGS, prefersReducedMotion } from '../lib/spring';

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
    // Dim to focus: the page behind recedes while a modal task is open.
    const html = document.documentElement;
    html.style.setProperty('--modal-origin', `${window.scrollY + window.innerHeight / 2}px`);
    html.dataset.modal = String(Number(html.dataset.modal || 0) + 1);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      const n = Number(html.dataset.modal || 1) - 1;
      if (n > 0) html.dataset.modal = String(n); else delete html.dataset.modal;
      if (previous && typeof previous.focus === 'function') previous.focus({ preventScroll: true });
    };
  }, [active, ref]);
}

// Direct manipulation for sheets: the surface follows the finger 1:1 from
// where it was grabbed (after a 10px intent threshold), resists past its
// open position (rubber band), and on release projects the flick's momentum
// to decide close vs. stay, then hands the finger's velocity to a spring.
// Grabbing it again mid-flight continues from the on-screen value.
//   axis 'x' → drag right to dismiss; axis 'y' → drag down to dismiss.
//   handleRef (optional) limits where a drag may start (e.g. a sheet grabber).
export function useDragDismiss(sheetRef, { axis = 'x', enabled = true, onDismiss, scrimRef, handleRef }) {
  const dismissRef = useRef(onDismiss);
  useEffect(() => { dismissRef.current = onDismiss; });

  useEffect(() => {
    const el = sheetRef.current;
    const handle = handleRef?.current ?? el;
    if (!el || !handle || !enabled) return undefined;
    let start = null;
    let offset = 0;
    let dragging = false;
    let history = [];
    let anim = null;
    let suppressClick = false;
    const size = () => (axis === 'x' ? el.offsetWidth : el.offsetHeight) || 1;
    const set = (v) => {
      offset = v;
      el.style.transform = axis === 'x' ? `translate3d(${v}px, 0, 0)` : `translate3d(0, ${v}px, 0)`;
      if (scrimRef?.current) scrimRef.current.style.opacity = String(Math.max(0, Math.min(1, 1 - v / size())));
    };
    const down = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // Dragging from content: scrolled content owns the gesture. A dedicated
      // grabber handle is always draggable.
      if (axis === 'y' && !handleRef?.current) {
        const sc = e.target.closest?.('[data-scroll]');
        if (sc && sc.scrollTop > 0) return; // scrolled content owns the gesture
      }
      if (anim) { anim.stop(); anim = null; }
      // A small dedicated handle captures at once (the finger leaves it
      // immediately); a whole-surface handle captures only once a drag is
      // recognized, so taps on its buttons still click.
      if (handleRef?.current) handle.setPointerCapture?.(e.pointerId);
      start = { x: e.clientX, y: e.clientY, offset, id: e.pointerId };
      history = [{ t: performance.now(), p: offset }];
      dragging = false;
    };
    const move = (e) => {
      if (!start || e.pointerId !== start.id) return;
      const d = axis === 'x' ? e.clientX - start.x : e.clientY - start.y;
      const cross = axis === 'x' ? e.clientY - start.y : e.clientX - start.x;
      if (!dragging) {
        if (Math.abs(d) < 10 && Math.abs(cross) < 10) return;
        if (Math.abs(cross) > Math.abs(d)) { start = null; return; } // it's a scroll
        dragging = true;
        handle.setPointerCapture?.(e.pointerId);
        el.style.transition = 'none';
        if (scrimRef?.current) scrimRef.current.style.transition = 'none';
      }
      let v = start.offset + d;
      if (v < 0) v = -rubberband(-v, size());
      set(v);
      history.push({ t: performance.now(), p: v });
      if (history.length > 6) history.shift();
    };
    const up = (e) => {
      if (!start || e.pointerId !== start.id) return;
      const was = dragging;
      start = null;
      dragging = false;
      if (!was) return;
      suppressClick = true;
      const a = history[0];
      const b = history[history.length - 1];
      const vel = b.t > a.t ? ((b.p - a.p) / (b.t - a.t)) * 1000 : 0;
      const dismiss = offset + project(vel) > size() / 2;
      const cfg = !prefersReducedMotion() && Math.abs(vel) > 700 ? SPRINGS.flick : SPRINGS.sheet;
      anim = animateSpring({
        from: offset, to: dismiss ? size() : 0, velocity: vel, ...cfg,
        damping: dismiss ? 1 : cfg.damping,
        onUpdate: set,
        onComplete: () => {
          anim = null;
          if (dismiss) {
            dismissRef.current?.();
          } else {
            el.style.transform = '';
            el.style.transition = '';
            if (scrimRef?.current) { scrimRef.current.style.opacity = ''; scrimRef.current.style.transition = ''; }
          }
        },
      });
    };
    const click = (e) => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); suppressClick = false; } };
    handle.addEventListener('pointerdown', down);
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
    handle.addEventListener('click', click, true);
    return () => {
      anim?.stop();
      handle.removeEventListener('pointerdown', down);
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      handle.removeEventListener('click', click, true);
    };
  }, [sheetRef, handleRef, scrimRef, axis, enabled]);
}

// Zoom a dialog out of the element that opened it, and back into it on
// close (spatial consistency: same path both ways). Desktop only; phones
// use the bottom sheet. `origin` is the trigger's DOMRect.
export function useZoomFromOrigin(ref, state, origin) {
  const animRef = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !origin || prefersReducedMotion() || !el.animate) return;
    if (window.matchMedia('(max-width: 768px)').matches) return;
    const r = el.getBoundingClientRect();
    const dx = origin.left + origin.width / 2 - (r.left + r.width / 2);
    const dy = origin.top + origin.height / 2 - (r.top + r.height / 2);
    const sx = Math.max(origin.width / r.width, 0.2);
    const sy = Math.max(origin.height / r.height, 0.06);
    const from = { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0 };
    const to = { transform: 'none', opacity: 1 };
    const css = getComputedStyle(document.documentElement);
    const easing = css.getPropertyValue('--spring-snappy').trim() || 'cubic-bezier(0.22, 1, 0.36, 1)';
    const duration = parseFloat(css.getPropertyValue('--spring-snappy-dur')) || 400;
    animRef.current?.cancel();
    const frames = state === 'open' ? [from, to] : [to, from];
    try {
      animRef.current = el.animate(frames, { duration, easing, fill: 'forwards' });
    } catch {
      // older engines reject linear() in WAAPI — same path, standard curve
      animRef.current = el.animate(frames, { duration, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' });
    }
  }, [ref, state, origin]);
}

// Keyboard + pointer activation props for a clickable table row. Keeps the
// native row role so screen readers still announce the cells.
export function rowLinkProps(onActivate) {
  return {
    className: 'row-link',
    tabIndex: 0,
    onClick: (e) => onActivate(e),
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(e); }
    },
  };
}

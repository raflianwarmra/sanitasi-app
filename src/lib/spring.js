// Apple-style springs, described the way Apple does: a damping ratio
// (1 = critically damped, no overshoot; < 1 = bounce) and a response in
// seconds (how quickly it gets there — not a fixed duration).
//
// One source of truth for both worlds:
//  - CSS: springEasing() samples the analytic step response into a CSS
//    `linear()` easing + settle duration, installed as --spring-* tokens.
//    CSS transitions retarget from the current value, so they stay
//    interruptible for non-gesture UI (tap-opened sheets, popovers, press).
//  - JS: animateSpring() integrates the same spring per frame for gesture
//    releases, starting from the on-screen value with the finger's velocity.

export const SPRINGS = {
  smooth: { damping: 1, response: 0.4 },   // move / reposition (Apple PiP)
  snappy: { damping: 1, response: 0.3 },   // popovers, dialogs, press
  sheet: { damping: 1, response: 0.36 },   // tap-opened sheets and pages
  flick: { damping: 0.8, response: 0.32 }, // only after a momentum gesture
};

function stepResponse({ damping, response }) {
  const w = (2 * Math.PI) / response;
  if (damping >= 1) return (t) => 1 - (1 + w * t) * Math.exp(-w * t);
  const wd = w * Math.sqrt(1 - damping * damping);
  return (t) => 1 - Math.exp(-damping * w * t) * (Math.cos(wd * t) + ((damping * w) / wd) * Math.sin(wd * t));
}

export function springEasing(cfg) {
  const f = stepResponse(cfg);
  let settle = cfg.response;
  for (let t = 0; t < 4; t += 0.004) if (Math.abs(1 - f(t)) > 0.002) settle = t;
  const T = settle + 0.004;
  const n = 48;
  const pts = Array.from({ length: n + 1 }, (_, i) => (i === n ? 1 : Number(f((T * i) / n).toFixed(4))));
  return { easing: `linear(${pts.join(', ')})`, duration: Math.round(T * 1000) };
}

export function installSpringTokens(root = document.documentElement) {
  // Engines without CSS linear() get a matching exponential ease-out instead
  // of an invalid declaration (which would silently drop the transition).
  const linearOk = typeof CSS !== 'undefined' && CSS.supports?.('transition-timing-function', 'linear(0, 1)');
  for (const [name, cfg] of Object.entries(SPRINGS)) {
    const spring = springEasing(cfg);
    const easing = linearOk ? spring.easing : 'cubic-bezier(0.22, 1, 0.36, 1)';
    const { duration } = spring;
    root.style.setProperty(`--spring-${name}`, easing);
    root.style.setProperty(`--spring-${name}-dur`, `${duration}ms`);
  }
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Per-frame spring from the current value + velocity (px/s) to a target.
// Returns a handle that can stop it at any frame (interruptible: a new grab
// reads `value` and continues from there).
export function animateSpring({ from, to, velocity = 0, damping = 1, response = 0.36, onUpdate, onComplete }) {
  const k = ((2 * Math.PI) / response) ** 2;
  const c = (4 * Math.PI * damping) / response;
  let x = from;
  let v = velocity;
  let last = performance.now();
  let raf = 0;
  let stopped = false;
  const tick = (now) => {
    if (stopped) return;
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    for (let i = 0; i < 4; i++) {
      const h = dt / 4;
      v += (-k * (x - to) - c * v) * h;
      x += v * h;
    }
    if (Math.abs(x - to) < 0.4 && Math.abs(v) < 8) {
      onUpdate(to);
      onComplete?.();
      return;
    }
    onUpdate(x);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return {
    stop() { stopped = true; cancelAnimationFrame(raf); },
    get value() { return x; },
  };
}

// Where a flick is heading (Apple's exponential-decay projection).
export function project(velocity, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

// Progressive resistance past a boundary.
export function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

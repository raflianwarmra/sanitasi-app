import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

// House chart motion + type: short critically-damped-feeling ease-out (state
// change, not choreography), none at all under reduced motion; the UI's
// system font so canvas text matches the page.
const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
Chart.defaults.animation = reduceMotion ? false : { duration: 260, easing: 'easeOutQuart' };
Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", system-ui, Roboto, sans-serif';
Chart.defaults.font.size = 11;

// Owns the canvas lifecycle: builds the Chart.js instance and guarantees
// destroy() on re-render/unmount (prevents canvas reuse leaks).

export default function ChartContainer({ height = 240, build, deps = [], ariaLabel }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const chart = build(canvasRef.current);
    return () => chart?.destroy?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return (
    <div style={{ position: 'relative', height, minWidth: 0, maxWidth: '100%' }}>
      <canvas ref={canvasRef} role="img" aria-label={ariaLabel} />
    </div>
  );
}

// HTML legend (screen-reader friendly, unlike canvas legends).
export function ChartLegend({ items, style }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', ...style }}>
      {items.map(({ color, label, value }) => (
        <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--ink-2)' }}>
          <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
          {label}
          {value != null && <strong className="num" style={{ color: 'var(--ink)' }}>{value}</strong>}
        </span>
      ))}
    </div>
  );
}

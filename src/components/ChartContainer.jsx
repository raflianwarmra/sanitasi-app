import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

// House chart defaults — adjusted in place (never replacing Chart.js's own
// default objects): short ease-out, no animation under reduced motion,
// rounded bars, 11px minimum tick text.
const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
Chart.defaults.animation.duration = reduceMotion ? 0 : 400;
Chart.defaults.font.size = 11;
Chart.defaults.elements.bar.borderRadius = 6;

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

// HTML legend (screen-reader friendly, unlike canvas legends). `line: true`
// draws a dashed swatch for reference lines.
export function ChartLegend({ items, style }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', ...style }}>
      {items.map(({ color, label, value, line }) => (
        <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--ink-2)' }}>
          {line
            ? <span aria-hidden="true" style={{ width: 12, height: 0, borderTop: `2px dashed ${color}`, flexShrink: 0 }} />
            : <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />}
          {label}
          {value != null && <strong className="num" style={{ color: 'var(--ink)' }}>{value}</strong>}
        </span>
      ))}
    </div>
  );
}

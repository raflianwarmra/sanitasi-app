import { useEffect, useRef } from 'react';

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
        <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--ink-2)' }}>
          <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
          {label}
          {value != null && <strong className="num" style={{ color: 'var(--ink)' }}>{value}</strong>}
        </span>
      ))}
    </div>
  );
}

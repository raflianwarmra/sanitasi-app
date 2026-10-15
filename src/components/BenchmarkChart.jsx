// Benchmark: the selected kab/kota highlighted among every peer in its
// province, with dashed reference lines for the provincial average and the
// national value. Plain HTML/CSS bars (no canvas): draws in every browser,
// stays crisp, reads to screen readers as a list.

import { useEffect, useRef } from 'react';
import { fmtPct } from '../lib/format';
import { ChartLegend } from './ChartContainer';

// Axis: a round step giving at most 5 intervals, max snapped to that step.
function niceScale(v) {
  const target = Math.max(v, 0.5) * 1.05;
  const step = [0.5, 1, 2, 2.5, 5, 10, 20, 25].find((s) => target / s <= 5) ?? 25;
  const max = Math.min(100, Math.ceil(target / step) * step);
  const ticks = [];
  for (let t = 0; t <= max + 1e-9; t += step) ticks.push(Math.round(t * 10) / 10);
  return { max, ticks };
}

export default function BenchmarkChart({
  title, metricKey, colorVar, rows, selectedKode, natValue, higherBetter = true,
}) {
  const scrollRef = useRef(null);
  const selRef = useRef(null);

  const sorted = [...rows]
    .filter((r) => r[metricKey] != null)
    .sort((a, b) => (higherBetter ? b[metricKey] - a[metricKey] : a[metricKey] - b[metricKey]));

  // Keep the selected kab/kota in view inside the scroll box (without
  // scrolling the page itself).
  useEffect(() => {
    const box = scrollRef.current;
    const row = selRef.current;
    if (!box || !row) return;
    box.scrollTop = Math.max(0, row.offsetTop - box.clientHeight / 2 + row.offsetHeight / 2);
  }, [selectedKode, metricKey]);

  if (!sorted.length) return null;

  const provAvg = sorted.reduce((s, r) => s + r[metricKey], 0) / sorted.length;
  const rank = sorted.findIndex((r) => String(r.kode) === String(selectedKode)) + 1;
  const { max, ticks } = niceScale(Math.max(...sorted.map((r) => r[metricKey]), provAvg, natValue ?? 0));
  const pct = (v) => `${(Math.min(Math.max(v, 0), max) / max) * 100}%`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        <span className="section-label">{title}</span>
        {rank > 0 && (
          <span className="text-caption">
            Peringkat <strong className="num" style={{ color: 'var(--ink)' }}>{rank}</strong> dari {sorted.length}
          </span>
        )}
      </div>
      <ChartLegend
        style={{ marginBottom: 12 }}
        items={[
          { color: `var(${colorVar})`, label: 'Kab/kota ini' },
          { color: 'var(--viz-muted)', label: 'Kab/kota lain' },
          { color: 'var(--ink-2)', label: 'Rata-rata provinsi', value: fmtPct(provAvg, 1), line: true },
          { color: 'var(--accent)', label: 'Rata-rata nasional', value: fmtPct(natValue, 1), line: true },
        ]}
      />

      <div
        ref={scrollRef}
        className="bench-scroll"
        tabIndex={0}
        role="region"
        aria-label={`${title}: ${sorted.length} kab/kota, urut ${higherBetter ? 'tertinggi' : 'terendah'} lebih dulu`}
      >
        <div className="bench">
          {/* grid + reference lines span the bar column of every row */}
          <div className="bench-overlay" aria-hidden="true">
            {ticks.map((t) => <span key={t} className="bench-grid" style={{ left: pct(t) }} />)}
            <span className="bench-ref" style={{ left: pct(provAvg), borderColor: 'var(--ink-2)' }} />
            {natValue != null && <span className="bench-ref" style={{ left: pct(natValue), borderColor: 'var(--accent)' }} />}
          </div>
          <ol className="bench-list">
            {sorted.map((r) => {
              const sel = String(r.kode) === String(selectedKode);
              return (
                <li key={r.kode} ref={sel ? selRef : undefined} className="bench-row" data-selected={sel || undefined}>
                  <span className="bench-label">{r.kabkot}</span>
                  <span className="bench-track">
                    <span className="bench-bar" style={{ width: pct(r[metricKey]), background: sel ? `var(${colorVar})` : 'var(--viz-muted)' }} />
                  </span>
                  <span className="bench-value num">{fmtPct(r[metricKey], 1)}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      <div className="bench-axis text-caption2" aria-hidden="true">
        <span className="bench-axis-inner">
          {ticks.map((t) => <span key={t} style={{ left: pct(t) }}>{String(t).replace('.', ',')}%</span>)}
        </span>
      </div>
    </div>
  );
}

// Benchmark chart: the selected kab/kota highlighted against every peer in
// its province, with dashed reference lines for the provincial average and
// the national 2025 value. One shared component, three metric instances.

import Chart from 'chart.js/auto';
import { cssVar } from '../lib/theme';
import { fmtPct } from '../lib/format';
import ChartContainer, { ChartLegend } from './ChartContainer';

// Dashed vertical reference lines drawn over the bars.
const refLinesPlugin = {
  id: 'refLines',
  afterDatasetsDraw(chart, _args, opts) {
    const { ctx, chartArea, scales } = chart;
    if (!chartArea || !opts?.lines) return;
    opts.lines.forEach(({ value, color }) => {
      if (value == null) return;
      const px = scales.x.getPixelForValue(value);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(px, chartArea.top);
      ctx.lineTo(px, chartArea.bottom);
      ctx.stroke();
      ctx.restore();
    });
  },
};

export default function BenchmarkChart({
  title, metricKey, colorVar, rows, selectedKode, natValue, theme, higherBetter = true,
}) {
  const sorted = [...rows]
    .filter((r) => r[metricKey] != null)
    .sort((a, b) => (higherBetter ? b[metricKey] - a[metricKey] : a[metricKey] - b[metricKey]));
  if (!sorted.length) return null;

  const provAvg = sorted.reduce((s, r) => s + r[metricKey], 0) / sorted.length;
  const rank = sorted.findIndex((r) => String(r.kode) === String(selectedKode)) + 1;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
        <span className="section-label">{title}</span>
        {rank > 0 && (
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
            Peringkat <strong className="num" style={{ color: 'var(--ink)' }}>{rank}</strong> dari {sorted.length}
          </span>
        )}
      </div>
      <ChartLegend
        style={{ marginBottom: 8 }}
        items={[
          { color: `var(${colorVar})`, label: 'Kab/kota ini' },
          { color: 'var(--viz-muted)', label: 'Kab/kota lain' },
          { color: 'var(--ink-2)', label: 'Rata-rata provinsi', value: fmtPct(provAvg, 1) },
          { color: 'var(--accent)', label: 'Rata-rata nasional', value: fmtPct(natValue, 1) },
        ]}
      />
      <div style={{ maxHeight: 340, overflowY: 'auto' }}>
        <ChartContainer
          height={Math.max(140, sorted.length * 18)}
          ariaLabel={`${title}: posisi kab/kota dibanding rata-rata provinsi dan nasional`}
          deps={[selectedKode, metricKey, sorted.length, theme]}
          build={(canvas) => new Chart(canvas, {
            type: 'bar',
            data: {
              labels: sorted.map((r) => r.kabkot),
              datasets: [{
                data: sorted.map((r) => r[metricKey]),
                backgroundColor: sorted.map((r) => (String(r.kode) === String(selectedKode) ? cssVar(colorVar) : cssVar('--viz-muted'))),
                barPercentage: 0.7,
              }],
            },
            options: {
              indexAxis: 'y', responsive: true, maintainAspectRatio: false,
              scales: {
                x: { grid: { color: cssVar('--viz-grid') }, ticks: { font: { size: 9 }, color: cssVar('--ink-3') } },
                y: {
                  grid: { display: false },
                  ticks: {
                    font: { size: 9 },
                    color: (c) => (sorted[c.index] && String(sorted[c.index].kode) === String(selectedKode) ? cssVar('--ink') : cssVar('--ink-3')),
                  },
                },
              },
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => fmtPct(Number(ctx.raw)) } },
                refLines: {
                  lines: [
                    { value: provAvg, color: cssVar('--ink-2') },
                    { value: natValue, color: cssVar('--accent') },
                  ],
                },
              },
            },
            plugins: [refLinesPlugin],
          })}
        />
      </div>
    </div>
  );
}

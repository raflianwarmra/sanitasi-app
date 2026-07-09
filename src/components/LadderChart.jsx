// Shared sanitation-ladder chart (single stacked horizontal bar + legend).
// Used at province and kab/kota level; NationalView reuses ladderColor for
// its year-series variant. Renders ONLY the rungs present in the source
// sheet and flags any canonical category the sheet doesn't carry — never
// fabricates a split.

import Chart from 'chart.js/auto';
import { ladderColor } from '../lib/ladder';
import { fmtPct } from '../lib/format';
import ChartContainer, { ChartLegend } from './ChartContainer';
import EmptyState from './EmptyState';

const CANONICAL = [
  'Akses Aman Terpusat',
  'Akses Aman Setempat',
  'Akses Layak Sendiri',
  'Akses Layak Bersama',
  'Akses Belum Layak',
  'BABS Tertutup',
  'BABS di Tempat Terbuka',
];

function missingCategories(rungs) {
  const labels = rungs.map((r) => r.label.toLowerCase());
  const hasCombinedAman = labels.some((l) => l === 'akses aman');
  return CANONICAL.filter((c) => {
    const cl = c.toLowerCase();
    if (labels.some((l) => l === cl)) return false;
    // A combined "Akses Aman" row covers both Aman sub-categories.
    if (hasCombinedAman && (cl === 'akses aman terpusat' || cl === 'akses aman setempat')) return false;
    return true;
  });
}

/**
 * @param {Array<{label: string, value: number}>|null} rungs real ladder rows
 * @param {string} idKey re-render key (e.g. selected kode)
 */
export default function LadderChart({ rungs, idKey, theme, height = 64 }) {
  const valid = (rungs ?? []).filter((r) => r.value != null);
  if (!valid.length) {
    return (
      <EmptyState
        compact icon="info"
        title="Data tangga sanitasi belum tersedia"
        text="Wilayah ini belum memiliki baris pada sheet ladder."
      />
    );
  }
  const missing = missingCategories(valid);

  return (
    <div>
      <ChartContainer
        height={height}
        ariaLabel="Komposisi tangga sanitasi"
        deps={[idKey, theme]}
        build={(canvas) => new Chart(canvas, {
          type: 'bar',
          data: {
            labels: ['2025'],
            datasets: valid.map((r) => ({
              label: r.label,
              data: [r.value],
              backgroundColor: ladderColor(r.label),
              stack: 'ladder',
            })),
          },
          options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            scales: { x: { stacked: true, display: false, max: 100 }, y: { stacked: true, display: false } },
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtPct(Number(ctx.raw))}` } },
            },
          },
        })}
      />
      <ChartLegend
        style={{ marginTop: 10 }}
        items={valid.map((r) => ({ color: ladderColor(r.label), label: r.label, value: fmtPct(r.value, 1) }))}
      />
      {missing.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8 }}>
          Belum tersedia pada sumber data: {missing.join(', ')}.
        </div>
      )}
    </div>
  );
}

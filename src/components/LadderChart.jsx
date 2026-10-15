// Shared sanitation-ladder bar: one segmented capsule (Screen Time style),
// rendered in plain HTML/CSS — no canvas, so it draws in every browser,
// scales crisply and follows the theme. Renders ONLY the rungs present in
// the source sheet and flags any canonical category the sheet doesn't
// carry — never fabricates a split.

import { ladderColorVar } from '../lib/ladder';
import { fmtPct } from '../lib/format';
import { ChartLegend } from './ChartContainer';
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
 */
export default function LadderChart({ rungs, height = 28 }) {
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
  const summary = valid.map((r) => `${r.label} ${fmtPct(r.value, 1)}`).join(', ');

  return (
    <div>
      <div className="ladder-bar" style={{ height }} role="img" aria-label={`Komposisi tangga sanitasi: ${summary}`}>
        {valid.filter((r) => r.value > 0).map((r) => (
          <span
            key={r.label}
            className="ladder-seg"
            title={`${r.label}: ${fmtPct(r.value, 1)}`}
            style={{ flexGrow: r.value, background: ladderColorVar(r.label) }}
          />
        ))}
      </div>
      <ChartLegend
        style={{ marginTop: 12 }}
        items={valid.map((r) => ({ color: ladderColorVar(r.label), label: r.label, value: fmtPct(r.value, 1) }))}
      />
      {missing.length > 0 && (
        <div className="text-caption" style={{ marginTop: 8 }}>
          Belum tersedia pada sumber data: {missing.join(', ')}.
        </div>
      )}
    </div>
  );
}

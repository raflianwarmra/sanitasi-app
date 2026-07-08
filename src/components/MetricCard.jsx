// Compact KPI: label, tabular figure, context line. Status via text color of
// the figure only — no colored borders or decorated surfaces.

const TONES = {
  default: 'var(--ink)',
  accent: 'var(--accent)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  bad: 'var(--bad)',
  layak: 'var(--viz-layak)',
  aman: 'var(--viz-aman)',
  babs: 'var(--viz-babs)',
};

export default function MetricCard({ label, value, unit, sub, tone = 'default', size = 26 }) {
  return (
    <div className="kpi">
      <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)', marginBottom: 4 }}>{label}</div>
      <div className="num" style={{ fontSize: size, fontWeight: 700, lineHeight: 1.15, color: TONES[tone] ?? TONES.default }}>
        {value ?? '—'}
        {unit && value != null && (
          <span style={{ fontSize: Math.round(size * 0.55), fontWeight: 500, color: 'var(--ink-3)', marginLeft: 2 }}>{unit}</span>
        )}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

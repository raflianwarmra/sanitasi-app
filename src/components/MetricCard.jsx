// Compact KPI: label, tabular figure, context line, optional 0–100 meter.
// Status via the figure's text color only — no colored borders or surfaces.

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

export default function MetricCard({ label, value, unit, sub, tone = 'default', size, meter }) {
  const color = TONES[tone] ?? TONES.default;
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value num" style={{ color, ...(size ? { fontSize: `${size / 16}rem` } : null) }}>
        {value ?? '—'}
        {unit && value != null && <span className="kpi-unit">{unit}</span>}
      </div>
      {meter != null && (
        <div className="meter" aria-hidden="true">
          <span style={{ width: `${Math.min(Math.max(meter, 0), 100)}%`, background: color }} />
        </div>
      )}
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

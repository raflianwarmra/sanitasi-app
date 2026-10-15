// KPI tile in the Apple Health manner: colored dot + label, large rounded
// figure, gray context line, optional 0–100 meter. The figure takes a color
// only when it carries status (ok / warn / bad); series tones color the dot.

const TONES = {
  default: null,
  accent: 'var(--accent)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  bad: 'var(--bad)',
  layak: 'var(--viz-layak)',
  aman: 'var(--viz-aman)',
  babs: 'var(--viz-babs)',
};
const STATUS = new Set(['ok', 'warn', 'bad']);

export default function MetricCard({ label, value, unit, sub, tone = 'default', size, meter }) {
  const color = TONES[tone] ?? null;
  const valueColor = STATUS.has(tone) ? color : 'var(--ink)';
  return (
    <div className="kpi">
      <div className="kpi-label">
        {color && <span className="kpi-dot" style={{ background: color }} aria-hidden="true" />}
        {label}
      </div>
      <div className="kpi-value" style={{ color: valueColor, ...(size ? { fontSize: `${size / 16}rem` } : null) }}>
        {value ?? '—'}
        {unit && value != null && <span className="kpi-unit">{unit}</span>}
      </div>
      {meter != null && (
        <div className="meter" aria-hidden="true">
          <span style={{ width: `${Math.min(Math.max(meter, 0), 100)}%`, background: color ?? 'var(--accent)' }} />
        </div>
      )}
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

export default function KpiCard({ label, value, delta, deltaGood = true, unit = '%' }) {
  const isPositive = delta && (String(delta).startsWith('+') || parseFloat(delta) > 0);
  const deltaColor = deltaGood ? (isPositive ? 'var(--ok)' : 'var(--bad)') : (isPositive ? 'var(--bad)' : 'var(--ok)');

  return (
    <div className="kpi">
      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 4 }}>
        {value ?? '—'}
        {unit && value != null && <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>{unit}</span>}
      </div>
      {delta && (
        <div style={{ fontSize: 11, color: deltaColor, marginTop: 2, fontFamily: 'JetBrains Mono' }}>
          {delta}
        </div>
      )}
    </div>
  );
}

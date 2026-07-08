// Card with a standard header row (title + optional subtitle + actions).

export default function SectionCard({ title, subtitle, actions, children, pad = true, style }) {
  return (
    <section className="card" style={{ padding: 0, overflow: 'hidden', ...style }}>
      {(title || actions) && (
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid var(--line-2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 14.5, fontWeight: 600, margin: 0, letterSpacing: '-0.005em' }}>{title}</h2>
            {subtitle && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div>}
        </div>
      )}
      <div style={pad ? { padding: 16 } : undefined}>{children}</div>
    </section>
  );
}

// The one elevated surface: title (+ subtitle) and optional actions, then
// content. No divider under the header; spacing does the grouping.

export default function SectionCard({ title, subtitle, actions, children, pad = true, style }) {
  return (
    <section className="card" style={{ padding: 0, overflow: 'hidden', ...style }}>
      {(title || actions) && (
        <div className="card-head">
          <div style={{ minWidth: 0 }}>
            <h2 className="text-headline" style={{ margin: 0 }}>{title}</h2>
            {subtitle && <div className="text-caption" style={{ marginTop: 2 }}>{subtitle}</div>}
          </div>
          {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div>}
        </div>
      )}
      <div className={pad ? 'card-body' : 'card-body-flush'}>{children}</div>
    </section>
  );
}

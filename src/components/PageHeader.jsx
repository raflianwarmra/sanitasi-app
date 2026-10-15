// Page identity band: large title first, then an identity line (island ·
// scope) and a quieter meta line, right-aligned controls, and an optional
// hero extension (children — e.g. the KPI card row). Transparent: it sits on
// the page's own background (the island sky + motif come from .island-page).
//
// Lines are .inline-list: separators belong to the item after them and the
// one that would start a wrapped line is clipped, so no "·" ever dangles.

const asItems = (v) => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(' · ') : [v]).filter(Boolean);

export default function PageHeader({ context, title, titleExtra, meta, controls, island, children }) {
  const metaItems = meta ? asItems(meta) : [];
  return (
    <div>
      <div className="page-wrap page-pad page-header" style={{ paddingBottom: children ? 20 : 28 }}>
        <div className="page-header-id">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 className="text-title title-mobile vt-title" style={{ margin: 0, wordBreak: 'break-word' }}>
              {title}
            </h1>
            {titleExtra}
          </div>
          {(context || island) && (
            <div className="inline-list text-body" style={{ marginTop: 8 }}>
              <ul>
                {island && (
                  <li>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span className="island-badge">{island.name}</span>
                      <span className="island-nuance">{island.note}</span>
                    </span>
                  </li>
                )}
                {context && <li style={{ fontWeight: 500, color: 'var(--ink)' }}>{context}</li>}
              </ul>
            </div>
          )}
          {metaItems.length > 0 && (
            <div className="inline-list text-body" style={{ marginTop: 4, color: 'var(--ink-2)' }}>
              <ul>{metaItems.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}
        </div>
        {controls && <div className="page-header-controls">{controls}</div>}
      </div>
      {children && (
        <div className="page-wrap page-pad" style={{ paddingBottom: 28 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// Page identity band: large title first, then a context line (island ·
// scope · meta), right-aligned controls, and an optional hero extension
// (children — e.g. the KPI card row). Transparent: it sits on the page's
// own background (the island glow comes from islandPageBackground).

export default function PageHeader({ context, title, titleExtra, meta, controls, island, children }) {
  return (
    <div>
      <div className="page-wrap page-pad" style={{
        paddingTop: 20, paddingBottom: children ? 20 : 28,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ minWidth: 0, flex: '1 1 300px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 className="text-title title-mobile" style={{ margin: 0, wordBreak: 'break-word' }}>
              {title}
            </h1>
            {titleExtra}
          </div>
          {(context || island || meta) && (
            <div className="text-body" style={{ color: 'var(--ink-2)', marginTop: 6, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 8px' }}>
              {island && (
                <span className="chip" style={{ background: `color-mix(in srgb, ${island.accent} 82%, black)`, color: '#fff' }}>
                  {island.name}
                </span>
              )}
              {context && <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{context}</span>}
              {context && meta && <span aria-hidden="true" style={{ color: 'var(--ink-3)' }}>·</span>}
              {meta && <span>{meta}</span>}
            </div>
          )}
        </div>
        {controls && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', minWidth: 0 }}>
            {controls}
          </div>
        )}
      </div>
      {children && (
        <div className="page-wrap page-pad" style={{ paddingBottom: 28 }}>
          {children}
        </div>
      )}
    </div>
  );
}

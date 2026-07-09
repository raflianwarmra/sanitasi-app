// Page identity band: kicker, title, meta, and right-aligned controls.
// Optional island theming: a subtle accent wash + abstract motif corner —
// chrome only, data colors elsewhere are never affected.

import IslandMotif from './IslandMotif';

export default function PageHeader({ kicker, title, titleExtra, meta, controls, island }) {
  const wash = island
    ? `color-mix(in oklch, ${island.accent} 6%, var(--paper))`
    : 'var(--paper)';
  return (
    <div style={{ background: wash, borderBottom: '1px solid var(--line)', position: 'relative', overflow: 'hidden' }}>
      {island && <IslandMotif island={island} />}
      <div className="page-wrap page-pad" style={{
        paddingTop: 20, paddingBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        flexWrap: 'wrap', gap: 14, position: 'relative',
      }}>
        <div style={{ minWidth: 0, flex: '1 1 280px' }}>
          {kicker && (
            <div className="section-label" style={{ marginBottom: 6, color: island ? island.accent : undefined }}>
              {kicker}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 className="title-mobile" style={{
              fontSize: 24, fontWeight: 700, letterSpacing: '-0.015em',
              margin: 0, lineHeight: 1.2, wordBreak: 'break-word',
            }}>
              {title}
            </h1>
            {titleExtra}
          </div>
          {meta && <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 5 }}>{meta}</div>}
        </div>
        {controls && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', minWidth: 0 }}>
            {controls}
          </div>
        )}
      </div>
    </div>
  );
}

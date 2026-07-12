// Page identity band: kicker, title, meta, and right-aligned controls.
// Island theming: a strong accent wash + motif corner in the chrome only —
// data colors elsewhere (charts/map/tables) are never affected.
//
// IMPORTANT: the decorative layer (wash + motif) is clipped inside its OWN
// absolutely-positioned wrapper (inset:0), never on the header itself.
// Clipping the header would also clip absolutely-positioned children such
// as the province dropdown, cutting its option list off mid-render.

import IslandMotif from './IslandMotif';

export default function PageHeader({ kicker, title, titleExtra, meta, controls, island }) {
  return (
    <div style={{ position: 'relative', background: 'var(--paper)', borderBottom: '1px solid var(--line)' }}>
      {island && (
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(90deg, color-mix(in oklch, ${island.accent} 12%, var(--paper)), var(--paper) 55%)`,
            transition: 'background 0.25s ease-out',
          }} />
          <div style={{
            position: 'absolute', top: 0, bottom: 0, right: 0, width: 'min(340px, 42%)',
            background: `linear-gradient(90deg, transparent, ${island.accent} 45%)`,
            transition: 'background 0.25s ease-out',
          }} />
          <IslandMotif island={island} color="oklch(98% 0.005 230)" opacity={0.32} width={300} />
        </div>
      )}
      <div className="page-wrap page-pad" style={{
        paddingTop: 20, paddingBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        flexWrap: 'wrap', gap: 14, position: 'relative',
      }}>
        <div style={{ minWidth: 0, flex: '1 1 280px' }}>
          {kicker && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              {island && (
                <span style={{
                  background: island.accent, color: 'oklch(98% 0.005 230)',
                  fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em',
                  padding: '3px 9px', borderRadius: 5, textTransform: 'uppercase',
                  transition: 'background 0.25s ease-out',
                }}>
                  {island.name}
                </span>
              )}
              <div className="section-label" style={{ color: island ? island.accent : undefined, fontWeight: island ? 700 : undefined }}>
                {kicker}
              </div>
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

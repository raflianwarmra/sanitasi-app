// Page identity band: title first, then a context line (scope · island ·
// meta), right-aligned controls, and an optional hero extension (children —
// e.g. the KPI card row) sharing the same island-themed background.
//
// The island treatment is the container's OWN background (color + a
// vertical gradient + an SVG-tile background-image) — never an absolutely
// positioned overlay. It fades vertically into islandPageBackground's top
// tone, so hero and page read as one continuous surface.

import { motifTileUri, PAGE_TOP_MIX, MOTIF_OPACITY } from '../lib/islandTheme';

export default function PageHeader({ context, title, titleExtra, meta, controls, island, children }) {
  const heroStyle = island
    ? {
        backgroundColor: `color-mix(in oklch, ${island.accent} 22%, var(--bg-base))`,
        backgroundImage: [
          motifTileUri(island, MOTIF_OPACITY),
          `linear-gradient(180deg, transparent 0%, transparent 45%, color-mix(in oklch, ${island.accent} ${PAGE_TOP_MIX}%, var(--bg-base)) 100%)`,
        ].join(', '),
        transition: 'background-color var(--dur-2) var(--ease-out)',
      }
    : { background: 'transparent' };

  return (
    <div style={heroStyle}>
      <div className="page-wrap page-pad" style={{
        paddingTop: 22, paddingBottom: children ? 16 : 22,
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
                <span className="chip" style={{ background: `color-mix(in oklch, ${island.accent} 82%, black)`, color: 'oklch(98% 0.005 230)', fontWeight: 600 }}>
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
        <div className="page-wrap page-pad" style={{ paddingBottom: 24 }}>
          {children}
        </div>
      )}
    </div>
  );
}

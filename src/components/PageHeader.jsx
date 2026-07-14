// Page identity band: kicker, title, meta, right-aligned controls, and an
// optional hero extension (children — e.g. the KPI card row) sharing the
// same island-themed background.
//
// The island treatment is the container's OWN background (color + layered
// CSS gradients + an SVG-tile background-image) — never an absolutely
// positioned overlay, so there is no clipping/stacking/interaction risk.
// It softens toward the bottom into the page's subtle island tint
// (var(--bg)) rather than plain white.

import { motifTileUri } from '../lib/islandTheme';

export default function PageHeader({ kicker, title, titleExtra, meta, controls, island, children }) {
  const heroStyle = island
    ? {
        backgroundColor: `color-mix(in oklch, ${island.accent} 24%, var(--paper))`,
        backgroundImage: [
          // vertical soften: fade into the page's tinted background
          `linear-gradient(180deg, transparent 0%, transparent 55%, color-mix(in oklch, ${island.accent} 14%, var(--bg-base)) 100%)`,
          // left readability wash: text zone stays calm, motif shows right
          `linear-gradient(90deg, color-mix(in oklch, ${island.accent} 10%, var(--paper)) 0%, color-mix(in oklch, ${island.accent} 10%, var(--paper)) 40%, transparent 78%)`,
          motifTileUri(island),
        ].join(', '),
        transition: 'background-color 0.25s ease-out',
      }
    : { background: 'var(--paper)' };

  return (
    <div style={{ ...heroStyle, borderBottom: island ? 'none' : '1px solid var(--line)' }}>
      <div className="page-wrap page-pad" style={{
        paddingTop: 20, paddingBottom: children ? 12 : 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        flexWrap: 'wrap', gap: 14,
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
      {children && (
        <div className="page-wrap page-pad" style={{ paddingBottom: 22 }}>
          {children}
        </div>
      )}
    </div>
  );
}

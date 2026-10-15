// KPI + trend chart card for one indicator. Header stacks vertically
// (label → figure → target line) so the eye reads top-to-bottom instead of
// swinging between pinned corners.

import SectionCard from './SectionCard';
import ChartContainer from './ChartContainer';
import { fmtPct } from '../lib/format';

export default function IndicatorCard({
  title, currentLabel = 'Capaian 2025', current,
  targetLabel, target, note, build, deps, ariaLabel, tone,
}) {
  return (
    <SectionCard title={title} pad>
      <div style={{ paddingBottom: 14, marginBottom: 6 }}>
        <div style={{ fontSize: '0.71875rem', color: 'var(--ink-3)', fontWeight: 500 }}>{currentLabel}</div>
        <div className="num-display" style={{ fontSize: '2.25rem', fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.02em', color: tone }}>
          {current != null ? fmtPct(current) : '—'}
        </div>
        {(target != null || note) && (
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--ink-3)', marginTop: 4 }}>
            {target != null && (
              <span>
                {targetLabel}: <strong className="num" style={{ color: 'var(--ink-2)' }}>{fmtPct(target, 1)}</strong>
              </span>
            )}
            {note && <span>{note}</span>}
          </div>
        )}
      </div>
      <ChartContainer height={190} build={build} deps={deps} ariaLabel={ariaLabel} />
    </SectionCard>
  );
}

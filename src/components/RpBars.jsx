// Rupiah bars for the Anggaran views, in plain HTML/CSS (no canvas) on the
// same pieces as LadderChart (.ladder-bar capsule) and BenchmarkChart
// (.bench-* bar list). Only ALD carries a data color; everything else stays
// neutral.

import { fmtPct, fmtRp } from '../lib/format';
import { ChartLegend } from './ChartContainer';
import Icon from './Icon';

// One segmented capsule: each segment's share of the whole.
export function ShareBar({ segments, ariaLabel, height = 20 }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div className="ladder-bar" style={{ height }} role="img" aria-label={ariaLabel}>
      {segments.filter((s) => s.value > 0).map((s) => (
        <span
          key={s.key}
          className="ladder-seg"
          title={`${s.label}: ${fmtRp(s.value)} (${fmtPct((s.value / total) * 100, 1)})`}
          style={{ flexGrow: s.value, background: s.color }}
        />
      ))}
    </div>
  );
}

// Sorted bar list with Rupiah values. A row may stack several segments
// (e.g. Pemprov + kab/kota) on one bar; all rows share one scale. Rows with
// `onToggle` become disclosure buttons whose `children` show when expanded;
// rows with `onClick` are plain buttons (open a profile).
export function RpBarList({ rows, ariaLabel, legend, scroll = false }) {
  const max = Math.max(...rows.map((r) => r.segments.reduce((s, x) => s + x.value, 0)), 1);
  const pct = (v) => `${(v / max) * 100}%`;

  const bar = (r) => {
    let left = 0;
    return (
      <span className="bench-track">
        {r.segments.filter((s) => s.value > 0).map((s) => {
          const style = { left: pct(left), width: pct(s.value), background: s.color };
          left += s.value;
          return <span key={s.key} className="bench-bar" style={style} />;
        })}
      </span>
    );
  };

  const list = (
    <ol className="bench-list">
      {rows.map((r) => {
        const total = r.segments.reduce((s, x) => s + x.value, 0);
        const content = (
          <>
            <span className="bench-label">
              {r.onToggle && <Icon name="chevronRight" size={12} className="disclosure" />}
              <span className="bench-label-text">{r.label}</span>
            </span>
            {bar(r)}
            <span className="bench-value num">{fmtRp(total)}</span>
          </>
        );
        return (
          <li key={r.key}>
            {r.onToggle || r.onClick ? (
              <button
                type="button" className="bench-row bench-row-btn"
                aria-expanded={r.onToggle ? !!r.expanded : undefined}
                onClick={r.onToggle ?? r.onClick}
              >
                {content}
              </button>
            ) : (
              <div className="bench-row" data-selected={r.selected || undefined}>{content}</div>
            )}
            {r.expanded && r.children && <div className="bench-detail">{r.children}</div>}
          </li>
        );
      })}
    </ol>
  );

  return (
    <div>
      {legend && <ChartLegend style={{ marginBottom: 12 }} items={legend} />}
      <div
        className={`bench-rp${scroll ? ' bench-scroll' : ''}`}
        {...(scroll ? { tabIndex: 0, role: 'region', 'aria-label': ariaLabel } : { 'aria-label': ariaLabel, role: 'group' })}
      >
        {list}
      </div>
    </div>
  );
}

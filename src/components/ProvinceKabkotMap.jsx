import { useEffect, useMemo, useRef, useState } from 'react';
import { loadProvinceGeo, loadNationalGeo, makeProjection, geometryToPath } from '../lib/geo';
import { MAP_METRICS } from '../lib/mapMetrics';
import { fmtPct } from '../lib/format';
import EmptyState from './EmptyState';
import Icon from './Icon';

// SVG choropleth of kabupaten/kota within one province.
// Join: BPS kode first, normalized name as fallback. Graceful fallback to a
// ranked list when geometry is unavailable. Click selects (detail card with
// profile link); keyboard accessible (Tab + Enter).

const VIEW_W = 760;
const VIEW_H = 540;
const NO_DATA = 'var(--viz-muted)';

function normName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\b(kabupaten|kab\.?|adm\.?|administrasi)\b/g, '')
    .replace(/[^a-z]/g, '');
}

function bandOf(value, thresholds) {
  if (value == null || isNaN(value)) return -1;
  let b = 0;
  for (const t of thresholds) { if (value >= t) b++; }
  return b;
}

function legendLabels(thresholds) {
  const t = thresholds;
  return [
    `< ${t[0]}%`,
    `${t[0]}–${t[1]}%`,
    `${t[1]}–${t[2]}%`,
    `${t[2]}–${t[3]}%`,
    `≥ ${t[3]}%`,
  ];
}

function RankedFallback({ kabs, metricDef, onOpenProfile }) {
  const rows = useMemo(() => [...kabs].sort((a, b) => {
    const d = (b[metricDef.key] ?? -Infinity) - (a[metricDef.key] ?? -Infinity);
    return metricDef.higherBetter ? d : -d;
  }), [kabs, metricDef]);
  const max = Math.max(...rows.map((r) => r[metricDef.key] ?? 0), 1);
  const strong = metricDef.ramp[4];

  return (
    <div>
      <EmptyState
        compact icon="map"
        title="Geometri peta tidak tersedia"
        text="Menampilkan peringkat kab/kota sebagai alternatif."
      />
      <div style={{ display: 'grid', gap: 6, maxHeight: 380, overflowY: 'auto', padding: '0 4px 8px' }}>
        {rows.map((k, i) => (
          <button
            key={k.kode || k.kabkot}
            type="button"
            onClick={() => onOpenProfile?.(k)}
            style={{
              all: 'unset', cursor: 'pointer', display: 'grid',
              gridTemplateColumns: '24px minmax(90px, 160px) 1fr 60px',
              alignItems: 'center', gap: 10, fontSize: 12, padding: '3px 6px', borderRadius: 5,
            }}
          >
            <span className="num" style={{ color: 'var(--ink-3)' }}>{i + 1}</span>
            <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.kabkot}</span>
            <span style={{ height: 8, background: 'var(--line-2)', borderRadius: 4, overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', borderRadius: 4, width: `${((k[metricDef.key] ?? 0) / max) * 100}%`, background: strong }} />
            </span>
            <span className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{fmtPct(k[metricDef.key], 1)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ProvinceKabkotMap({ provKode, kabs, metric = 'aman', onOpenProfile }) {
  const metricDef = MAP_METRICS[metric] ?? MAP_METRICS.aman;

  // Geometry state keyed by province — loading is derived (prov mismatch),
  // so the effect never needs a synchronous setState.
  const [geoState, setGeoState] = useState({ prov: null, fc: null, failed: false });
  // Hover/selection are also keyed by province: switching provinces
  // invalidates them without an effect reset.
  const [hover, setHover] = useState(null); // { prov, kode, x, y, w }
  const [sel, setSel] = useState(null); // { prov, kode }
  const wrapRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (provKode === 'ID' ? loadNationalGeo() : loadProvinceGeo(provKode))
      .then((fc) => { if (alive) setGeoState({ prov: provKode, fc, failed: false }); })
      .catch(() => { if (alive) setGeoState({ prov: provKode, fc: null, failed: true }); });
    return () => { alive = false; };
  }, [provKode]);

  const loading = geoState.prov !== provKode;
  const geo = loading ? null : geoState.fc;
  const failed = !loading && geoState.failed;
  const selectedKode = sel && sel.prov === provKode ? sel.kode : null;
  const hoverCur = hover && hover.prov === provKode ? hover : null;

  // kode -> kab row (with normalized-name fallback)
  const kabByKode = useMemo(() => {
    const byKode = new Map(kabs.map((k) => [String(k.kode), k]));
    const byName = new Map(kabs.map((k) => [normName(k.kabkot), k]));
    return { byKode, byName };
  }, [kabs]);

  // Projected SVG paths (memoized: only reprojects when geometry changes).
  const shapes = useMemo(() => {
    if (!geo?.features?.length) return null;
    const project = makeProjection(geo.features, VIEW_W, VIEW_H, 10);
    if (!project) return null;
    return geo.features.map((ft) => ({
      kode: String(ft.properties.kode),
      nama: ft.properties.nama,
      d: geometryToPath(ft.geometry, project),
    }));
  }, [geo]);

  // Ranking within the province for the active metric.
  const ranks = useMemo(() => {
    const withVal = kabs.filter((k) => k[metricDef.key] != null);
    const sorted = [...withVal].sort((a, b) => metricDef.higherBetter
      ? (b[metricDef.key] ?? 0) - (a[metricDef.key] ?? 0)
      : (a[metricDef.key] ?? 0) - (b[metricDef.key] ?? 0));
    const m = new Map();
    sorted.forEach((k, i) => m.set(String(k.kode), i + 1));
    return { map: m, total: withVal.length };
  }, [kabs, metricDef]);

  const findKab = (kode, nama) =>
    kabByKode.byKode.get(String(kode)) ?? kabByKode.byName.get(normName(nama)) ?? null;

  if (loading) {
    return <div className="skeleton" style={{ height: 380 }} aria-label="Memuat peta…" />;
  }
  if (failed || !shapes) {
    return <RankedFallback kabs={kabs} metricDef={metricDef} onOpenProfile={onOpenProfile} />;
  }

  const hoverShape = hoverCur ? shapes.find((s) => s.kode === hoverCur.kode) : null;
  const hoverKab = hoverShape ? findKab(hoverShape.kode, hoverShape.nama) : null;
  const selShape = selectedKode ? shapes.find((s) => s.kode === selectedKode) : null;
  const selKab = selShape ? findKab(selShape.kode, selShape.nama) : null;

  return (
    <div>
      <div ref={wrapRef} style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 520 }}
          role="group"
          aria-label={`Peta ${metricDef.label} per kabupaten/kota`}
        >
          {shapes.map((s) => {
            const kab = findKab(s.kode, s.nama);
            const val = kab ? kab[metricDef.key] : null;
            const band = bandOf(val, metricDef.thresholds);
            const fill = band < 0 ? NO_DATA : metricDef.ramp[band];
            const isActive = hoverCur?.kode === s.kode || selectedKode === s.kode;
            return (
              <path
                key={s.kode}
                d={s.d}
                fill={fill}
                stroke={isActive ? 'var(--ink)' : 'var(--paper)'}
                strokeWidth={isActive ? 1.6 : 0.7}
                tabIndex={0}
                role="button"
                aria-label={`${kab?.kabkot ?? s.nama}: ${metricDef.label} ${val != null ? fmtPct(val, 1) : 'data tidak tersedia'}`}
                style={{ cursor: 'pointer', outline: 'none', transition: 'stroke-width 0.12s ease-out' }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.closest('svg').parentElement.getBoundingClientRect();
                  setHover({
                    prov: provKode, kode: s.kode,
                    x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width,
                  });
                }}
                onMouseLeave={() => setHover((h) => (h?.kode === s.kode ? null : h))}
                onFocus={() => setSel({ prov: provKode, kode: s.kode })}
                onClick={() => setSel((cur) => (cur?.kode === s.kode && cur?.prov === provKode ? null : { prov: provKode, kode: s.kode }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSel({ prov: provKode, kode: s.kode });
                  }
                }}
              />
            );
          })}
        </svg>

        {hoverCur && hoverShape && (
          <div style={{
            position: 'absolute',
            left: Math.min(hoverCur.x + 14, hoverCur.w - 190),
            top: hoverCur.y + 14,
            pointerEvents: 'none', zIndex: 5,
            background: 'var(--paper)', border: '1px solid var(--line)',
            borderRadius: 7, boxShadow: 'var(--shadow-pop)', padding: '9px 11px', width: 180,
          }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>{hoverKab?.kabkot ?? hoverShape.nama}</div>
            {hoverKab ? (
              <div style={{ display: 'grid', gap: 2, fontSize: 11.5, color: 'var(--ink-2)' }}>
                <span>Aman <strong className="num">{fmtPct(hoverKab.aman2025, 1)}</strong></span>
                <span>Layak <strong className="num">{fmtPct(hoverKab.layak2025, 1)}</strong></span>
                <span>BABS <strong className="num">{fmtPct(hoverKab.babs2025, 1)}</strong></span>
                {ranks.map.get(hoverShape.kode) && (
                  <span style={{ color: 'var(--ink-3)', marginTop: 2 }}>
                    Peringkat {metricDef.label}: {ranks.map.get(hoverShape.kode)}/{ranks.total}
                  </span>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Data tidak tersedia</div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', alignItems: 'center', padding: '10px 4px 0' }}>
        <span className="section-label">{metricDef.label} 2025</span>
        {legendLabels(metricDef.thresholds).map((lbl, i) => (
          <span key={lbl} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--ink-2)' }}>
            <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 3, background: metricDef.ramp[i], border: '1px solid var(--line)' }} />
            {lbl}
          </span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--ink-3)' }}>
          <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 3, background: NO_DATA, border: '1px solid var(--line)' }} />
          Tanpa data
        </span>
      </div>

      {/* Selected detail card */}
      {selKab && (
        <div className="fade-in" style={{
          marginTop: 12, padding: '12px 14px', border: '1px solid var(--line)',
          borderRadius: 7, background: 'var(--paper-2)',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 18px',
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{selKab.kabkot}</div>
            {ranks.map.get(String(selKab.kode)) && (
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                Peringkat {metricDef.label} ke-{ranks.map.get(String(selKab.kode))} dari {ranks.total}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink-2)', flexWrap: 'wrap' }}>
            <span>Aman <strong className="num" style={{ color: 'var(--viz-aman)' }}>{fmtPct(selKab.aman2025, 1)}</strong></span>
            <span>Layak <strong className="num" style={{ color: 'var(--viz-layak)' }}>{fmtPct(selKab.layak2025, 1)}</strong></span>
            <span>BABS <strong className="num" style={{ color: 'var(--viz-babs)' }}>{fmtPct(selKab.babs2025, 1)}</strong></span>
          </div>
          <button
            type="button" className="btn btn-accent btn-sm" style={{ marginLeft: 'auto' }}
            onClick={() => onOpenProfile?.(selKab)}
          >
            Buka profil kab/kota
            <Icon name="arrowRight" size={13} />
          </button>
        </div>
      )}
      {!selKab && (
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', padding: '8px 4px 0' }}>
          Arahkan kursor untuk detail · klik wilayah untuk memilih, lalu buka profil kab/kota.
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import Chart from 'chart.js/auto';
import { cssVar } from '../lib/theme';
import { fmtPct } from '../lib/format';
import { NAT_YEARS } from '../lib/sheets';
import { MAP_METRICS } from '../lib/mapMetrics';
import { ISLANDS, islandOf } from '../lib/islandTheme';
import SectionCard from './SectionCard';
import MetricCard from './MetricCard';
import IndicatorCard from './IndicatorCard';
import ChartContainer, { ChartLegend } from './ChartContainer';
import ProvinceKabkotMap from './ProvinceKabkotMap';
import EmptyState from './EmptyState';
import Icon from './Icon';

const LADDER_COLOR_RULES = [
  { test: /layak sendiri/, color: () => cssVar('--viz-layak') },
  { test: /layak bersama/, color: () => '#97AFDE' },
  { test: /belum layak/, color: () => cssVar('--viz-muted') },
  { test: /babs tertutup/, color: () => cssVar('--warn') },
  { test: /babs/, color: () => cssVar('--viz-babs') },
  { test: /aman/, color: () => cssVar('--viz-aman') },
];

function ladderColor(label) {
  const l = label.toLowerCase();
  const rule = LADDER_COLOR_RULES.find((r) => r.test.test(l));
  return rule ? rule.color() : cssVar('--viz-muted');
}

function natChartOpts() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: cssVar('--viz-grid') }, ticks: { font: { size: 10 }, color: cssVar('--ink-3') } },
      x: { grid: { display: false }, ticks: { font: { size: 9 }, color: cssVar('--ink-3') } },
    },
  };
}

export default function NationalView({
  provinces, nasional, ladder, kabkotAll, ipal, iplt, theme, onOpenProvince,
}) {
  const [mapMetric, setMapMetric] = useState('aman');
  const metricDef = MAP_METRICS[mapMetric];

  const hasNat = nasional && (nasional.aman || nasional.layak || nasional.babs);
  const aman25 = nasional?.aman?.y2025;
  const layak25 = nasional?.layak?.y2025;
  const babs25 = nasional?.babs?.y2025;

  // Province rows in the shape the map/table expects (kabkot = display name).
  const provRows = useMemo(() => provinces.map((p) => ({
    kode: String(p.kode).trim(),
    kabkot: p.provinsi,
    aman2025: p.aman2025,
    layak2025: p.layak2025,
    babs2025: p.babs2025,
  })), [provinces]);

  const rankedProv = useMemo(() => {
    const withVal = provRows.filter((r) => r[metricDef.key] != null);
    return [...withVal].sort((a, b) => (metricDef.higherBetter
      ? (b[metricDef.key] ?? 0) - (a[metricDef.key] ?? 0)
      : (a[metricDef.key] ?? 0) - (b[metricDef.key] ?? 0)));
  }, [provRows, metricDef]);

  // National infrastructure + priority counts (full datasets, no filter).
  const infraNat = useMemo(() => {
    const ipalGood = ipal.filter((x) => x.isFunctioning).length;
    const ipltGood = iplt.filter((x) => x.isFunctioning).length;
    const haveIPLT = new Set(iplt.map((i) => String(i.kode)));
    const noIPLT = kabkotAll.filter((k) => !haveIPLT.has(String(k.kode)));
    return {
      ipal: ipal.length, ipalGood,
      iplt: iplt.length, ipltGood,
      broken: (ipal.length - ipalGood) + (iplt.length - ipltGood),
      noIPLT: noIPLT.length,
      babsHigh: kabkotAll.filter((k) => (k.babs2025 ?? 0) > 10).length,
      amanLow: kabkotAll.filter((k) => k.aman2025 != null && k.aman2025 < 5).length,
    };
  }, [ipal, iplt, kabkotAll]);

  const interpretasi = hasNat
    ? `Akses sanitasi layak nasional ${fmtPct(layak25, 1)} dan akses aman ${fmtPct(aman25, 1)} pada 2025; ` +
      `BABS di tempat terbuka tersisa ${fmtPct(babs25, 1)}. ` +
      `${infraNat.noIPLT} kab/kota belum memiliki IPLT dan ${infraNat.broken} unit infrastruktur tidak berfungsi.`
    : 'Data nasional belum termuat.';

  const yearsLbl = NAT_YEARS.map(String);

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* Interpretation + diversity band */}
      <SectionCard title="Ringkasan Nasional · 2025" subtitle='Sumber: sheet "Nasional" (BPS)'>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: 640 }}>
          {interpretasi}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, alignItems: 'center' }}>
          <span className="section-label" style={{ marginRight: 4 }}>Tujuh Wilayah Kepulauan</span>
          {Object.values(ISLANDS).map((isl) => (
            <span key={isl.id} className="chip" style={{ fontSize: 10.5, gap: 6 }} title={isl.note}>
              <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 3, background: isl.accent, display: 'inline-block' }} />
              {isl.name}
            </span>
          ))}
        </div>
      </SectionCard>

      {/* National indicator trends 2017-2025 */}
      {hasNat ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <IndicatorCard
            title="Akses Layak (termasuk Aman)"
            current={layak25} tone="var(--viz-layak)"
            note="Tren nasional 2017–2025"
            ariaLabel="Tren akses layak nasional 2017 sampai 2025"
            deps={['nas-layak', theme]}
            build={(canvas) => new Chart(canvas, {
              type: 'bar',
              data: {
                labels: yearsLbl,
                datasets: [{ data: NAT_YEARS.map((y) => nasional.layak?.[`y${y}`]), backgroundColor: cssVar('--viz-layak'), borderRadius: 3, maxBarThickness: 30 }],
              },
              options: natChartOpts(),
            })}
          />
          <IndicatorCard
            title="Akses Aman"
            current={aman25} tone="var(--viz-aman)"
            note="Tren nasional 2017–2025"
            ariaLabel="Tren akses aman nasional 2017 sampai 2025"
            deps={['nas-aman', theme]}
            build={(canvas) => new Chart(canvas, {
              type: 'bar',
              data: {
                labels: yearsLbl,
                datasets: [{ data: NAT_YEARS.map((y) => nasional.aman?.[`y${y}`]), backgroundColor: cssVar('--viz-aman'), borderRadius: 3, maxBarThickness: 30 }],
              },
              options: natChartOpts(),
            })}
          />
          <IndicatorCard
            title="BABS di Tempat Terbuka"
            current={babs25} tone="var(--viz-babs)"
            note="Tren nasional 2017–2025"
            ariaLabel="Tren BABS terbuka nasional 2017 sampai 2025"
            deps={['nas-babs', theme]}
            build={(canvas) => {
              const c = cssVar('--viz-babs');
              return new Chart(canvas, {
                type: 'line',
                data: {
                  labels: yearsLbl,
                  datasets: [{ data: NAT_YEARS.map((y) => nasional.babs?.[`y${y}`]), borderColor: c, backgroundColor: c, tension: 0.1, pointRadius: 3 }],
                },
                options: natChartOpts(),
              });
            }}
          />
        </div>
      ) : (
        <SectionCard title="Indikator Nasional">
          <EmptyState compact icon="info" title="Data nasional belum tersedia" text='Periksa sheet "Nasional" pada Google Sheets sumber.' />
        </SectionCard>
      )}

      {/* Ladder Nasional */}
      <SectionCard title="Tangga Sanitasi Nasional · 2017–2025" subtitle='Sumber: sheet "Ladder Nasional" — komposisi enam jenjang akses'>
        {ladder.length ? (
          <>
            <ChartContainer
              height={260}
              ariaLabel="Komposisi tangga sanitasi nasional 2017 sampai 2025"
              deps={[ladder.length, theme]}
              build={(canvas) => new Chart(canvas, {
                type: 'bar',
                data: {
                  labels: yearsLbl,
                  datasets: ladder.map((rung) => ({
                    label: rung.label,
                    data: NAT_YEARS.map((y) => rung.values[`y${y}`]),
                    backgroundColor: ladderColor(rung.label),
                    stack: 'ladder',
                    barPercentage: 0.68,
                  })),
                },
                options: {
                  responsive: true, maintainAspectRatio: false,
                  scales: {
                    x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 }, color: cssVar('--ink-3') } },
                    y: { stacked: true, max: 100, grid: { color: cssVar('--viz-grid') }, ticks: { font: { size: 10 }, color: cssVar('--ink-3') } },
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtPct(Number(ctx.raw))}` } },
                  },
                },
              })}
            />
            <ChartLegend
              style={{ marginTop: 10 }}
              items={ladder.map((rung) => ({ color: ladderColor(rung.label), label: rung.label, value: fmtPct(rung.values.y2025, 1) }))}
            />
          </>
        ) : (
          <EmptyState compact icon="info" title="Ladder nasional belum tersedia" text='Periksa sheet "Ladder Nasional".' />
        )}
      </SectionCard>

      {/* National choropleth of provinces */}
      <SectionCard
        title="Peta Sebaran Provinsi"
        subtitle="Klik provinsi untuk membuka profilnya"
        actions={(
          <div className="seg" role="group" aria-label="Pilih indikator peta">
            {Object.entries(MAP_METRICS).map(([k, def]) => (
              <button key={k} type="button" aria-pressed={mapMetric === k} onClick={() => setMapMetric(k)}>
                {def.label}
              </button>
            ))}
          </div>
        )}
      >
        <ProvinceKabkotMap
          provKode="ID"
          kabs={provRows}
          metric={mapMetric}
          onOpenProfile={(row) => onOpenProvince(row.kode)}
        />
        {rankedProv.length > 1 && (
          <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line-2)' }}>
            {[
              { label: `${metricDef.label} terbaik`, rows: rankedProv.slice(0, 5), icon: 'arrowUp', color: 'var(--ok)' },
              { label: `${metricDef.label} perlu perhatian`, rows: rankedProv.slice(-5).reverse(), icon: 'arrowDown', color: 'var(--bad)' },
            ].map(({ label, rows, icon, color }) => (
              <div key={label}>
                <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Icon name={icon} size={12} style={{ color }} />
                  {label}
                </div>
                <div style={{ display: 'grid', gap: 4, maxWidth: 320 }}>
                  {rows.map((r) => (
                    <button
                      key={r.kode}
                      type="button"
                      onClick={() => onOpenProvince(r.kode)}
                      style={{ all: 'unset', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, padding: '5px 8px', borderRadius: 5 }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-2)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.kabkot}</span>
                      <span className="num" style={{ fontWeight: 600 }}>{fmtPct(r[metricDef.key], 1)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* National infrastructure + priority issues */}
      <SectionCard title="Infrastruktur & Isu Prioritas Nasional" subtitle="Agregat seluruh kab/kota">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <MetricCard label="Unit IPAL" value={infraNat.ipal} unit="" sub={`${infraNat.ipalGood} berfungsi`} />
          <MetricCard label="Unit IPLT" value={infraNat.iplt} unit="" sub={`${infraNat.ipltGood} berfungsi`} />
          <MetricCard label="Kab/Kota tanpa IPLT" value={infraNat.noIPLT} unit="" sub={`dari ${kabkotAll.length} kab/kota`} tone={infraNat.noIPLT ? 'warn' : 'ok'} />
          <MetricCard label="Unit tidak berfungsi" value={infraNat.broken} unit="" sub="IPAL + IPLT" tone={infraNat.broken ? 'bad' : 'ok'} />
          <MetricCard label="Kab/Kota BABS > 10%" value={infraNat.babsHigh} unit="" tone={infraNat.babsHigh ? 'bad' : 'ok'} sub="butuh percepatan" />
          <MetricCard label="Kab/Kota Aman < 5%" value={infraNat.amanLow} unit="" tone={infraNat.amanLow ? 'warn' : 'ok'} sub="akses aman rendah" />
        </div>
      </SectionCard>

      {/* Provinces table */}
      <SectionCard title="Data Provinsi · 2025" subtitle="Urut kode BPS · klik baris untuk membuka profil provinsi" pad={false}>
        <div className="table-scroll" style={{ maxHeight: 520 }}>
          <table className="data-table" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                <th>Provinsi</th>
                <th className="td-num">Akses Aman</th>
                <th className="td-num">Akses Layak</th>
                <th className="td-num">BABS Terbuka</th>
              </tr>
            </thead>
            <tbody>
              {provRows.map((r) => {
                const isl = islandOf(r.kode);
                const babsHi = (r.babs2025 ?? 0) > 10;
                return (
                  <tr key={r.kode} onClick={() => onOpenProvince(r.kode)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 500 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                        {isl && <span aria-hidden="true" title={isl.name} style={{ width: 8, height: 8, borderRadius: 2, background: isl.accent, flexShrink: 0 }} />}
                        {r.kabkot}
                      </span>
                    </td>
                    <td className="td-num">{fmtPct(r.aman2025)}</td>
                    <td className="td-num">{fmtPct(r.layak2025)}</td>
                    <td className="td-num" style={babsHi ? { color: 'var(--bad)', fontWeight: 600 } : undefined}>{fmtPct(r.babs2025)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

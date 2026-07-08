import { useState, useMemo } from 'react';
import Chart from 'chart.js/auto';
import { useProvinsi, useKabkot, useIPAL, useIPLT } from '../hooks/useSheetData';
import { useTheme, cssVar } from '../lib/theme';
import { fmtPct, csvNum, slugify } from '../lib/format';
import { downloadCsvSections } from '../lib/exportCsv';
import { exportProvincePptx } from '../lib/exportPptx';
import Breadcrumb from '../components/Breadcrumb';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import MetricCard from '../components/MetricCard';
import ChartContainer, { ChartLegend } from '../components/ChartContainer';
import ProvinceKabkotMap from '../components/ProvinceKabkotMap';
import { MAP_METRICS } from '../lib/mapMetrics';
import ExportButtons from '../components/ExportButtons';
import EmptyState from '../components/EmptyState';
import LoadingSpinner, { ErrorCard } from '../components/LoadingSpinner';
import SearchableSelect from '../components/SearchableSelect';
import Icon from '../components/Icon';

const YEARS = [2022, 2023, 2024, 2025];

function baseChartOpts() {
  const grid = cssVar('--viz-grid');
  const tick = cssVar('--ink-3');
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: grid }, ticks: { font: { size: 10 }, color: tick } },
      x: { grid: { display: false }, ticks: { font: { size: 10 }, color: tick } },
    },
  };
}

// KPI + trend chart card for one indicator.
function IndicatorCard({ title, current, targetLabel, target, note, build, deps, ariaLabel, tone }) {
  return (
    <SectionCard title={title} pad>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 10, borderBottom: '1px solid var(--line-2)', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>Capaian 2025</div>
          <div className="num" style={{ fontSize: 27, fontWeight: 700, lineHeight: 1.1, color: tone }}>
            {current != null ? fmtPct(current) : '—'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>{targetLabel}</div>
          <div className="num" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-2)' }}>
            {target != null ? fmtPct(target, 1) : '—'}
          </div>
          {note && <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 2 }}>{note}</div>}
        </div>
      </div>
      <ChartContainer height={190} build={build} deps={deps} ariaLabel={ariaLabel} />
    </SectionCard>
  );
}

export default function Provinsi({ onNavigate }) {
  const { data: provinces, loading: lP, error: eP, reload } = useProvinsi();
  const { data: kabkotAll } = useKabkot();
  const { data: ipal } = useIPAL();
  const { data: iplt } = useIPLT();
  const { theme } = useTheme();

  const [selected, setSelected] = useState(null);
  const [mapMetric, setMapMetric] = useState('aman');
  const [sortBy, setSortBy] = useState('aman');
  const [sortDir, setSortDir] = useState('desc');

  const sorted = useMemo(() => [...provinces].sort((a, b) => a.provinsi.localeCompare(b.provinsi, 'id')), [provinces]);
  const selectedProv = selected ?? sorted[0];
  const provKode = selectedProv ? String(selectedProv.kode).trim() : '';

  // Kab/kota within province: BPS kode prefix first, name match as fallback.
  const kabsInProv = useMemo(() => {
    if (!selectedProv) return [];
    const byKode = kabkotAll.filter((k) => provKode && String(k.kode).startsWith(provKode));
    if (byKode.length) return byKode;
    const name = selectedProv.provinsi.toLowerCase();
    return kabkotAll.filter((k) => k.provinsi?.toLowerCase() === name);
  }, [kabkotAll, selectedProv, provKode]);

  const ipalHere = useMemo(
    () => ipal.filter((i) => (i.kode && String(i.kode).startsWith(provKode)) || (i.provinsi && selectedProv && i.provinsi.toLowerCase() === selectedProv.provinsi.toLowerCase())),
    [ipal, selectedProv, provKode],
  );
  const ipltHere = useMemo(
    () => iplt.filter((i) => (i.kode && String(i.kode).startsWith(provKode)) || (i.provinsi && selectedProv && i.provinsi.toLowerCase() === selectedProv.provinsi.toLowerCase())),
    [iplt, selectedProv, provKode],
  );

  const kabsNoIPLT = useMemo(() => {
    if (!kabsInProv.length) return [];
    const have = new Set(ipltHere.map((i) => String(i.kode)));
    return kabsInProv.filter((k) => !have.has(String(k.kode)));
  }, [kabsInProv, ipltHere]);

  const brokenUnits = useMemo(() => [
    ...ipalHere.filter((x) => !x.isFunctioning),
    ...ipltHere.filter((x) => !x.isFunctioning),
  ], [ipalHere, ipltHere]);

  const babsHigh = useMemo(() => kabsInProv.filter((k) => (k.babs2025 ?? 0) > 10).sort((a, b) => (b.babs2025 ?? 0) - (a.babs2025 ?? 0)), [kabsInProv]);
  const amanLow = useMemo(() => kabsInProv.filter((k) => k.aman2025 != null && k.aman2025 < 5).sort((a, b) => (a.aman2025 ?? 0) - (b.aman2025 ?? 0)), [kabsInProv]);

  // Top/bottom for the active map metric.
  const metricDef = MAP_METRICS[mapMetric];
  const rankedByMetric = useMemo(() => {
    const withVal = kabsInProv.filter((k) => k[metricDef.key] != null);
    return [...withVal].sort((a, b) => metricDef.higherBetter
      ? (b[metricDef.key] ?? 0) - (a[metricDef.key] ?? 0)
      : (a[metricDef.key] ?? 0) - (b[metricDef.key] ?? 0));
  }, [kabsInProv, metricDef]);

  const tableRows = useMemo(() => {
    const key = sortBy === 'kabkot' ? 'kabkot' : sortBy === 'layak' ? 'layak2025' : sortBy === 'babs' ? 'babs2025' : 'aman2025';
    const mult = sortDir === 'asc' ? 1 : -1;
    return [...kabsInProv].sort((a, b) => {
      const av = a[key], bv = b[key];
      if (typeof av === 'string') return av.localeCompare(bv ?? '') * mult;
      return ((av ?? -Infinity) - (bv ?? -Infinity)) * mult;
    });
  }, [kabsInProv, sortBy, sortDir]);

  const onSort = (k) => {
    if (sortBy === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(k); setSortDir(k === 'kabkot' ? 'asc' : 'desc'); }
  };

  // ── Exports ──
  const handleCsv = () => {
    if (!selectedProv) return;
    downloadCsvSections(`sanitasi-provinsi-${slugify(selectedProv.provinsi)}`, [
      {
        title: `Indikator Provinsi ${selectedProv.provinsi} (%)`,
        columns: [
          { key: 'indikator', label: 'Indikator' },
          ...YEARS.map((y) => ({ key: `y${y}`, label: String(y) })),
          { key: 't26', label: 'Target 2026' },
          { key: 't29', label: 'Target 2029' },
        ],
        rows: [
          { indikator: 'Akses Layak (termasuk Aman)', ...Object.fromEntries(YEARS.map((y) => [`y${y}`, csvNum(selectedProv.layak[`y${y}`])])), t26: '', t29: '' },
          { indikator: 'Akses Aman', ...Object.fromEntries(YEARS.map((y) => [`y${y}`, csvNum(selectedProv.aman[`y${y}`])])), t26: csvNum(selectedProv.aman.target2026), t29: csvNum(selectedProv.aman.target2029) },
          { indikator: 'BABS Terbuka', ...Object.fromEntries(YEARS.map((y) => [`y${y}`, csvNum(selectedProv.babs[`y${y}`])])), t26: csvNum(selectedProv.babs.target2026), t29: csvNum(selectedProv.babs.target2029) },
        ],
      },
      {
        title: `Kab/Kota di ${selectedProv.provinsi} (%)`,
        columns: [
          { key: 'kode', label: 'Kode BPS' },
          { key: 'kabkot', label: 'Kabupaten/Kota' },
          { key: 'aman', label: 'Akses Aman 2025' },
          { key: 'layak', label: 'Akses Layak 2025' },
          { key: 'babs', label: 'BABS Terbuka 2025' },
        ],
        rows: kabsInProv.map((k) => ({
          kode: k.kode, kabkot: k.kabkot,
          aman: csvNum(k.aman2025), layak: csvNum(k.layak2025), babs: csvNum(k.babs2025),
        })),
      },
    ]);
  };

  const handlePptx = () => exportProvincePptx(selectedProv, kabsInProv, {
    ipal: ipalHere, iplt: ipltHere, kabsNoIPLT, broken: brokenUnits,
  });

  if (lP) return <LoadingSpinner text="Memuat data provinsi…" />;
  if (eP) return <ErrorCard message={eP} onRetry={reload} />;
  if (!selectedProv) {
    return <EmptyState icon="info" title="Tidak ada data provinsi" text='Periksa sheet "Akses Provinsi" pada Google Sheets sumber.' />;
  }

  const iGood = ipltHere.filter((x) => x.isFunctioning).length;
  const aGood = ipalHere.filter((x) => x.isFunctioning).length;
  const aman25 = selectedProv.aman.y2025;
  const layak25 = selectedProv.layak.y2025;
  const babs25 = selectedProv.babs.y2025;
  const layakNon = Math.max(0, (layak25 ?? 0) - (aman25 ?? 0));
  const sisa = Math.max(0, 100 - (layak25 ?? 0) - (babs25 ?? 0));

  const hasAlerts = kabsNoIPLT.length || brokenUnits.length || babsHigh.length || amanLow.length;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Breadcrumb
        path={[{ label: 'Beranda', path: '/' }, { label: 'Provinsi', path: '/provinsi' }, { label: selectedProv.provinsi }]}
        onNavigate={onNavigate}
      />

      <PageHeader
        kicker="Profil Sanitasi Provinsi"
        title={selectedProv.provinsi}
        meta={`${kabsInProv.length} kabupaten/kota · Akses layak, aman, BABS & infrastruktur · Data 2025`}
        controls={(
          <>
            <SearchableSelect
              style={{ width: 230 }}
              value={selectedProv.provinsi}
              onChange={(v) => setSelected(provinces.find((p) => p.provinsi === v) ?? null)}
              options={sorted.map((p) => p.provinsi)}
              placeholder="Pilih provinsi"
            />
            <ExportButtons onCsv={handleCsv} onPptx={handlePptx} />
          </>
        )}
      />

      <div className="page-wrap page-pad" style={{ paddingTop: 16, paddingBottom: 40, display: 'grid', gap: 16 }}>

        {/* Indicator trend cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <IndicatorCard
            title="Akses Layak (termasuk Aman)"
            current={layak25} targetLabel="Target nasional" target={100}
            tone="var(--viz-layak)"
            ariaLabel={`Tren akses layak ${selectedProv.provinsi} 2022 sampai 2025`}
            deps={[selectedProv.provinsi, theme]}
            build={(canvas) => new Chart(canvas, {
              type: 'bar',
              data: {
                labels: YEARS,
                datasets: [{ data: YEARS.map((y) => selectedProv.layak[`y${y}`]), backgroundColor: cssVar('--viz-layak'), borderRadius: 3, maxBarThickness: 42 }],
              },
              options: baseChartOpts(),
            })}
          />
          <IndicatorCard
            title="Akses Aman"
            current={aman25} targetLabel="Target 2029" target={selectedProv.aman.target2029}
            note={`Target 2026: ${fmtPct(selectedProv.aman.target2026, 1)}`}
            tone="var(--viz-aman)"
            ariaLabel={`Tren akses aman ${selectedProv.provinsi} dengan target 2026 dan 2029`}
            deps={[selectedProv.provinsi, theme]}
            build={(canvas) => {
              const labels = [...YEARS, 'T-2026', 'T-2029'];
              const values = [...YEARS.map((y) => selectedProv.aman[`y${y}`]), selectedProv.aman.target2026, selectedProv.aman.target2029];
              const c = cssVar('--viz-aman');
              return new Chart(canvas, {
                type: 'bar',
                data: {
                  labels,
                  datasets: [{
                    data: values,
                    backgroundColor: values.map((_, i) => (i < YEARS.length ? c : 'transparent')),
                    borderColor: c, borderWidth: 1.5, borderRadius: 3, borderSkipped: false, maxBarThickness: 42,
                  }],
                },
                options: baseChartOpts(),
              });
            }}
          />
          <IndicatorCard
            title="BABS di Tempat Terbuka"
            current={babs25} targetLabel="Target 2029" target={selectedProv.babs.target2029}
            note={`Target 2026: ${fmtPct(selectedProv.babs.target2026, 1)}`}
            tone="var(--viz-babs)"
            ariaLabel={`Tren BABS terbuka ${selectedProv.provinsi} dengan proyeksi target`}
            deps={[selectedProv.provinsi, theme]}
            build={(canvas) => {
              const labels = [...YEARS, 'T-2026', 'T-2029'];
              const values = [...YEARS.map((y) => selectedProv.babs[`y${y}`]), selectedProv.babs.target2026, selectedProv.babs.target2029];
              const c = cssVar('--viz-babs');
              return new Chart(canvas, {
                type: 'line',
                data: {
                  labels,
                  datasets: [{
                    data: values, borderColor: c, backgroundColor: c,
                    tension: 0.1, pointRadius: 3.5,
                    segment: { borderDash: (ctx) => (ctx.p0DataIndex >= YEARS.length - 1 ? [6, 6] : undefined) },
                  }],
                },
                options: baseChartOpts(),
              });
            }}
          />
        </div>

        {/* Ladder sanitasi */}
        <SectionCard
          title="Komposisi Akses Sanitasi · 2025"
          subtitle="Layak (non-aman) dihitung sebagai Layak − Aman; sisanya akses dasar/belum layak."
        >
          <ChartContainer
            height={64}
            ariaLabel={`Komposisi akses sanitasi ${selectedProv.provinsi} 2025`}
            deps={[selectedProv.provinsi, theme]}
            build={(canvas) => new Chart(canvas, {
              type: 'bar',
              data: {
                labels: ['2025'],
                datasets: [
                  { label: 'Akses Aman', data: [aman25 ?? 0], backgroundColor: cssVar('--viz-aman') },
                  { label: 'Layak (non-Aman)', data: [layakNon], backgroundColor: cssVar('--viz-layak') },
                  { label: 'Dasar / Belum Layak', data: [sisa], backgroundColor: cssVar('--viz-muted') },
                  { label: 'BABS Terbuka', data: [babs25 ?? 0], backgroundColor: cssVar('--viz-babs') },
                ],
              },
              options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                scales: { x: { stacked: true, display: false, max: 100 }, y: { stacked: true, display: false } },
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtPct(Number(ctx.raw))}` } },
                },
              },
            })}
          />
          <ChartLegend
            style={{ marginTop: 10 }}
            items={[
              { color: 'var(--viz-aman)', label: 'Akses Aman', value: fmtPct(aman25) },
              { color: 'var(--viz-layak)', label: 'Layak (non-Aman)', value: fmtPct(layakNon) },
              { color: 'var(--viz-muted)', label: 'Dasar / Belum Layak', value: fmtPct(sisa) },
              { color: 'var(--viz-babs)', label: 'BABS Terbuka', value: fmtPct(babs25) },
            ]}
          />
        </SectionCard>

        {/* Choropleth map */}
        <SectionCard
          title="Peta Sebaran Kab/Kota"
          subtitle="Warna wilayah mengikuti indikator terpilih · klik wilayah untuk membuka profil"
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
            provKode={provKode}
            kabs={kabsInProv}
            metric={mapMetric}
            onOpenProfile={(kab) => onNavigate(`/kabkota?provinsi=${encodeURIComponent(selectedProv.provinsi)}&kode=${encodeURIComponent(kab.kode)}`)}
          />

          {/* Top & bottom for the active metric */}
          {rankedByMetric.length > 1 && (
            <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line-2)' }}>
              {[
                { label: `${metricDef.label} terbaik`, rows: rankedByMetric.slice(0, 5), icon: 'arrowUp', color: 'var(--ok)' },
                { label: `${metricDef.label} perlu perhatian`, rows: rankedByMetric.slice(-5).reverse(), icon: 'arrowDown', color: 'var(--bad)' },
              ].map(({ label, rows, icon, color }) => (
                <div key={label}>
                  <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Icon name={icon} size={12} style={{ color }} />
                    {label}
                  </div>
                  <div style={{ display: 'grid', gap: 4 }}>
                    {rows.map((k) => (
                      <button
                        key={k.kode || k.kabkot}
                        type="button"
                        onClick={() => onNavigate(`/kabkota?provinsi=${encodeURIComponent(selectedProv.provinsi)}&kode=${encodeURIComponent(k.kode)}`)}
                        style={{
                          all: 'unset', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                          gap: 10, fontSize: 12.5, padding: '5px 8px', borderRadius: 5,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.kabkot}</span>
                        <span className="num" style={{ fontWeight: 600 }}>{fmtPct(k[metricDef.key], 1)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Infrastructure summary */}
        <SectionCard title="Infrastruktur IPAL & IPLT" subtitle={`Aset air limbah domestik tercatat di ${selectedProv.provinsi}`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            <MetricCard label="Unit IPAL" value={ipalHere.length} unit="" sub={`${aGood} berfungsi · ${ipalHere.length - aGood} tidak`} />
            <MetricCard label="Unit IPLT" value={ipltHere.length} unit="" sub={`${iGood} berfungsi · ${ipltHere.length - iGood} tidak`} />
            <MetricCard label="Kab/Kota tanpa IPLT" value={kabsNoIPLT.length} unit="" sub={`dari ${kabsInProv.length} kab/kota`} tone={kabsNoIPLT.length ? 'warn' : 'ok'} />
            <MetricCard label="Unit tidak berfungsi" value={brokenUnits.length} unit="" sub="IPAL + IPLT" tone={brokenUnits.length ? 'bad' : 'ok'} />
          </div>
        </SectionCard>

        {/* Structured alerts */}
        <SectionCard title="Isu Prioritas" subtitle="Hal yang memerlukan tindak lanjut perencanaan">
          {!hasAlerts && (
            <EmptyState compact icon="check" title="Tidak ada isu prioritas terdeteksi" text="Seluruh indikator provinsi ini berada dalam ambang wajar." />
          )}
          {hasAlerts && (
            <div style={{ display: 'grid', gap: 14 }}>
              {kabsNoIPLT.length > 0 && (
                <AlertGroup
                  tone="bad" title={`${kabsNoIPLT.length} kab/kota belum memiliki IPLT`}
                  items={kabsNoIPLT.map((k) => ({ id: k.kode || k.kabkot, label: k.kabkot }))}
                />
              )}
              {brokenUnits.length > 0 && (
                <AlertGroup
                  tone="warn" title={`${brokenUnits.length} unit IPAL/IPLT tidak berfungsi`}
                  items={brokenUnits.map((u) => ({ id: u.id, label: `${u.type} · ${u.nama}${u.kabkot ? ` (${u.kabkot})` : ''}` }))}
                />
              )}
              {babsHigh.length > 0 && (
                <AlertGroup
                  tone="bad" title={`${babsHigh.length} kab/kota dengan BABS terbuka > 10%`}
                  items={babsHigh.map((k) => ({ id: k.kode || k.kabkot, label: `${k.kabkot} · ${fmtPct(k.babs2025, 1)}` }))}
                />
              )}
              {amanLow.length > 0 && (
                <AlertGroup
                  tone="warn" title={`${amanLow.length} kab/kota dengan akses aman < 5%`}
                  items={amanLow.map((k) => ({ id: k.kode || k.kabkot, label: `${k.kabkot} · ${fmtPct(k.aman2025, 1)}` }))}
                />
              )}
            </div>
          )}
        </SectionCard>

        {/* Stacked distribution chart */}
        <SectionCard title="Capaian per Kab/Kota · 2025" subtitle="Urut dari akses layak tertinggi">
          <ChartLegend
            style={{ marginBottom: 10 }}
            items={[
              { color: 'var(--viz-aman)', label: 'Akses Aman' },
              { color: 'var(--viz-layak)', label: 'Layak (non-Aman)' },
              { color: 'var(--viz-babs)', label: 'BABS Terbuka' },
            ]}
          />
          <ChartContainer
            height={Math.max(280, kabsInProv.length * 22)}
            ariaLabel={`Capaian sanitasi per kab/kota di ${selectedProv.provinsi}`}
            deps={[selectedProv.provinsi, kabsInProv.length, theme]}
            build={(canvas) => {
              const s = [...kabsInProv].sort((a, b) => (b.layak2025 ?? 0) - (a.layak2025 ?? 0));
              const tick = cssVar('--ink-3');
              return new Chart(canvas, {
                type: 'bar',
                data: {
                  labels: s.map((k) => k.kabkot),
                  datasets: [
                    { label: 'Akses Aman', data: s.map((k) => k.aman2025 ?? 0), backgroundColor: cssVar('--viz-aman'), stack: 'm', barPercentage: 0.72 },
                    { label: 'Layak (non-Aman)', data: s.map((k) => Math.max(0, (k.layak2025 ?? 0) - (k.aman2025 ?? 0))), backgroundColor: cssVar('--viz-layak'), stack: 'm', barPercentage: 0.72 },
                    { label: 'BABS Terbuka', data: s.map((k) => k.babs2025 ?? 0), backgroundColor: cssVar('--viz-babs'), stack: 'm', barPercentage: 0.72 },
                  ],
                },
                options: {
                  indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  scales: {
                    x: { stacked: true, max: 120, grid: { color: cssVar('--viz-grid') }, ticks: { font: { size: 10 }, color: tick } },
                    y: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 }, color: tick } },
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${fmtPct(Number(ctx.raw))}`,
                        footer: (items) => {
                          let aman = 0, non = 0;
                          items.forEach((t) => {
                            if (t.dataset.label === 'Akses Aman') aman = Number(t.raw) || 0;
                            if (t.dataset.label === 'Layak (non-Aman)') non = Number(t.raw) || 0;
                          });
                          return `Total Akses Layak: ${fmtPct(aman + non)}`;
                        },
                      },
                    },
                  },
                },
              });
            }}
          />
        </SectionCard>

        {/* Table */}
        <SectionCard
          title={`Data Kab/Kota · ${selectedProv.provinsi}`}
          pad={false}
          actions={(
            <button className="btn btn-accent btn-sm" onClick={() => onNavigate(`/kabkota?provinsi=${encodeURIComponent(selectedProv.provinsi)}`)}>
              Profil kab/kota
              <Icon name="arrowRight" size={13} />
            </button>
          )}
        >
          <div className="table-scroll" style={{ maxHeight: 480 }}>
            <table className="data-table" style={{ minWidth: 520 }}>
              <thead>
                <tr>
                  {[['kabkot', 'Kabupaten/Kota', false], ['aman', 'Akses Aman', true], ['layak', 'Akses Layak', true], ['babs', 'BABS Terbuka', true]].map(([k, l, num]) => (
                    <th
                      key={k}
                      className={num ? 'td-num' : undefined}
                      aria-sort={sortBy === k ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                    >
                      <button
                        onClick={() => onSort(k)}
                        style={{
                          all: 'unset', cursor: 'pointer', font: 'inherit', color: 'inherit',
                          textTransform: 'inherit', letterSpacing: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        {l}
                        {sortBy === k && <Icon name={sortDir === 'asc' ? 'arrowUp' : 'arrowDown'} size={11} />}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((k) => {
                  const babsHi = (k.babs2025 ?? 0) > 10;
                  return (
                    <tr key={k.kode || k.kabkot} onClick={() => onNavigate(`/kabkota?provinsi=${encodeURIComponent(selectedProv.provinsi)}&kode=${encodeURIComponent(k.kode)}`)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: 500 }}>{k.kabkot}</td>
                      <td className="td-num">{fmtPct(k.aman2025)}</td>
                      <td className="td-num">{fmtPct(k.layak2025)}</td>
                      <td className="td-num" style={babsHi ? { color: 'var(--bad)', fontWeight: 600 } : undefined}>{fmtPct(k.babs2025)}</td>
                    </tr>
                  );
                })}
                {tableRows.length === 0 && (
                  <tr><td colSpan={4}><EmptyState compact icon="info" title="Tidak ada kab/kota" text='Data sheet "Akses Kabkot" tidak memiliki baris untuk provinsi ini.' /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function AlertGroup({ tone, title, items }) {
  const chipClass = tone === 'bad' ? 'chip-bad' : 'chip-warn';
  const color = tone === 'bad' ? 'var(--bad)' : 'var(--warn)';
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        <Icon name="alert" size={14} style={{ color }} />
        {title}
      </div>
      <div className="no-scrollbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
        {items.map((it) => (
          <span key={it.id} className={`chip ${chipClass}`} style={{ fontSize: 10.5 }}>{it.label}</span>
        ))}
      </div>
    </div>
  );
}

import { useState, useMemo, useEffect } from 'react';
import Chart from 'chart.js/auto';
import { useProvinsi, useKabkot, useIPAL, useIPLT, useNasional, useLadderNasional, useLadderProvinsi } from '../hooks/useSheetData';
import { useTheme, cssVar } from '../lib/theme';
import { fmtPct, csvNum, slugify } from '../lib/format';
import { downloadCsvSections } from '../lib/exportCsv';
import { exportProvincePptx } from '../lib/exportPptx';
import { NAT_YEARS } from '../lib/sheets';
import { islandOf } from '../lib/islandTheme';
import Breadcrumb from '../components/Breadcrumb';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import MetricCard from '../components/MetricCard';
import IndicatorCard from '../components/IndicatorCard';
import ProvinceKabkotMap from '../components/ProvinceKabkotMap';
import { MAP_METRICS } from '../lib/mapMetrics';
import NationalView from '../components/NationalView';
import PriorityIssueCards from '../components/PriorityIssueCards';
import LadderChart from '../components/LadderChart';
import ExportButtons from '../components/ExportButtons';
import EmptyState from '../components/EmptyState';
import LoadingSpinner, { ErrorCard } from '../components/LoadingSpinner';
import SearchableSelect from '../components/SearchableSelect';
import Icon from '../components/Icon';

const YEARS = [2022, 2023, 2024, 2025];
const NATIONAL_KEY = '__nasional__';

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

export default function Provinsi({ onNavigate }) {
  const { data: provinces, loading: lP, error: eP, reload } = useProvinsi();
  const { data: kabkotAll } = useKabkot();
  const { data: ipal } = useIPAL();
  const { data: iplt } = useIPLT();
  const { data: nasional } = useNasional();
  const { data: ladder } = useLadderNasional();
  const { data: ladderProv } = useLadderProvinsi();
  const { theme } = useTheme();

  // National is the default view; provinces sorted by BPS kode.
  const [selectedKode, setSelectedKode] = useState(NATIONAL_KEY);
  const [mapMetric, setMapMetric] = useState('aman');
  const [sortBy, setSortBy] = useState('aman');
  const [sortDir, setSortDir] = useState('desc');

  const sorted = useMemo(
    () => [...provinces].sort((a, b) => Number(a.kode) - Number(b.kode)),
    [provinces],
  );
  const isNational = selectedKode === NATIONAL_KEY;
  const selectedProv = isNational
    ? null
    : (sorted.find((p) => String(p.kode).trim() === selectedKode) ?? sorted[0] ?? null);
  const provKode = selectedProv ? String(selectedProv.kode).trim() : '';
  const island = selectedProv ? islandOf(provKode) : null;

  // Island chrome tint: drives the TopNav strip + page background via CSS
  // vars on <html> (data colors are untouched).
  useEffect(() => {
    if (island) document.documentElement.setAttribute('data-island', island.id);
    else document.documentElement.removeAttribute('data-island');
    return () => document.documentElement.removeAttribute('data-island');
  }, [island]);

  const provLadder = useMemo(
    () => ladderProv.find((r) => r.kode === provKode) ?? null,
    [ladderProv, provKode],
  );

  const selectOptions = useMemo(() => [
    { value: NATIONAL_KEY, label: 'Indonesia — Nasional' },
    ...sorted.map((p) => ({ value: String(p.kode).trim(), label: p.provinsi })),
  ], [sorted]);

  // ── Province-scoped data (kode-prefix join, name fallback) ──
  const kabsInProv = useMemo(() => {
    if (!selectedProv) return [];
    const byKode = kabkotAll.filter((k) => provKode && String(k.kode).startsWith(provKode));
    if (byKode.length) return byKode;
    const name = selectedProv.provinsi.toLowerCase();
    return kabkotAll.filter((k) => k.provinsi?.toLowerCase() === name);
  }, [kabkotAll, selectedProv, provKode]);

  const ipalHere = useMemo(
    () => (selectedProv ? ipal.filter((i) => (i.kode && String(i.kode).startsWith(provKode)) || (i.provinsi && i.provinsi.toLowerCase() === selectedProv.provinsi.toLowerCase())) : []),
    [ipal, selectedProv, provKode],
  );
  const ipltHere = useMemo(
    () => (selectedProv ? iplt.filter((i) => (i.kode && String(i.kode).startsWith(provKode)) || (i.provinsi && i.provinsi.toLowerCase() === selectedProv.provinsi.toLowerCase())) : []),
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

  const metricDef = MAP_METRICS[mapMetric];
  const rankedByMetric = useMemo(() => {
    const withVal = kabsInProv.filter((k) => k[metricDef.key] != null);
    return [...withVal].sort((a, b) => (metricDef.higherBetter
      ? (b[metricDef.key] ?? 0) - (a[metricDef.key] ?? 0)
      : (a[metricDef.key] ?? 0) - (b[metricDef.key] ?? 0)));
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

  // ── National aggregates for exports ──
  const natNoIPLT = useMemo(() => {
    const have = new Set(iplt.map((i) => String(i.kode)));
    return kabkotAll.filter((k) => !have.has(String(k.kode)));
  }, [kabkotAll, iplt]);
  const natBroken = useMemo(() => [
    ...ipal.filter((x) => !x.isFunctioning),
    ...iplt.filter((x) => !x.isFunctioning),
  ], [ipal, iplt]);

  // ── Exports ──
  const handleCsv = () => {
    if (isNational) {
      downloadCsvSections('sanitasi-nasional-indonesia', [
        nasional?.layak && {
          title: 'Indikator Nasional (%)',
          columns: [{ key: 'indikator', label: 'Indikator' }, ...NAT_YEARS.map((y) => ({ key: `y${y}`, label: String(y) }))],
          rows: [
            { indikator: 'Akses Layak (termasuk Aman)', ...Object.fromEntries(NAT_YEARS.map((y) => [`y${y}`, csvNum(nasional.layak?.[`y${y}`])])) },
            { indikator: 'Akses Aman', ...Object.fromEntries(NAT_YEARS.map((y) => [`y${y}`, csvNum(nasional.aman?.[`y${y}`])])) },
            { indikator: 'BABS di Tempat Terbuka', ...Object.fromEntries(NAT_YEARS.map((y) => [`y${y}`, csvNum(nasional.babs?.[`y${y}`])])) },
          ],
        },
        ladder.length && {
          title: 'Tangga Sanitasi Nasional (%)',
          columns: [{ key: 'jenjang', label: 'Jenjang' }, ...NAT_YEARS.map((y) => ({ key: `y${y}`, label: String(y) }))],
          rows: ladder.map((r) => ({ jenjang: r.label, ...Object.fromEntries(NAT_YEARS.map((y) => [`y${y}`, csvNum(r.values[`y${y}`])])) })),
        },
        {
          title: 'Provinsi (%)',
          columns: [
            { key: 'kode', label: 'Kode BPS' },
            { key: 'provinsi', label: 'Provinsi' },
            { key: 'aman', label: 'Akses Aman 2025' },
            { key: 'layak', label: 'Akses Layak 2025' },
            { key: 'babs', label: 'BABS Terbuka 2025' },
          ],
          rows: sorted.map((p) => ({
            kode: p.kode, provinsi: p.provinsi,
            aman: csvNum(p.aman2025), layak: csvNum(p.layak2025), babs: csvNum(p.babs2025),
          })),
        },
      ].filter(Boolean));
      return;
    }
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

  const handlePptx = () => {
    if (isNational) {
      const pseudo = {
        kode: 'ID',
        provinsi: 'Indonesia',
        layak: { y2022: nasional?.layak?.y2022, y2023: nasional?.layak?.y2023, y2024: nasional?.layak?.y2024, y2025: nasional?.layak?.y2025 },
        aman: { y2022: nasional?.aman?.y2022, y2023: nasional?.aman?.y2023, y2024: nasional?.aman?.y2024, y2025: nasional?.aman?.y2025, target2026: null, target2029: null },
        babs: { y2022: nasional?.babs?.y2022, y2023: nasional?.babs?.y2023, y2024: nasional?.babs?.y2024, y2025: nasional?.babs?.y2025, target2026: null, target2029: null },
      };
      const provRows = sorted.map((p) => ({
        kode: String(p.kode).trim(), kabkot: p.provinsi,
        aman2025: p.aman2025, layak2025: p.layak2025, babs2025: p.babs2025,
      }));
      return exportProvincePptx(pseudo, provRows, {
        ipal, iplt,
        kabsNoIPLT: natNoIPLT,
        broken: natBroken,
      });
    }
    return exportProvincePptx(selectedProv, kabsInProv, {
      ipal: ipalHere, iplt: ipltHere, kabsNoIPLT, broken: brokenUnits,
    });
  };

  if (lP) return <LoadingSpinner text="Memuat data provinsi…" />;
  if (eP) return <ErrorCard message={eP} onRetry={reload} />;
  if (!sorted.length) {
    return <EmptyState icon="info" title="Tidak ada data provinsi" text='Periksa sheet "Akses Provinsi" pada Google Sheets sumber.' />;
  }

  // ── Province-view figures ──
  const aman25 = selectedProv?.aman.y2025;
  const layak25 = selectedProv?.layak.y2025;
  const babs25 = selectedProv?.babs.y2025;
  const iGood = ipltHere.filter((x) => x.isFunctioning).length;
  const aGood = ipalHere.filter((x) => x.isFunctioning).length;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Breadcrumb
        path={[
          { label: 'Beranda', path: '/' },
          { label: 'Provinsi', path: '/provinsi' },
          { label: isNational ? 'Nasional' : selectedProv.provinsi },
        ]}
        onNavigate={onNavigate}
      />

      <PageHeader
        kicker={isNational ? 'Profil Sanitasi Nasional' : 'Profil Sanitasi Provinsi'}
        title={isNational ? 'Indonesia' : selectedProv.provinsi}
        island={island}
        meta={isNational
          ? `${sorted.length} provinsi · ${kabkotAll.length} kabupaten/kota · Data 2017–2025`
          : `${kabsInProv.length} kabupaten/kota · Akses layak, aman, BABS & infrastruktur · Data 2025`}
        controls={(
          <>
            <SearchableSelect
              style={{ width: 230 }}
              value={selectedKode}
              onChange={setSelectedKode}
              options={selectOptions}
              sortOptions={false}
              placeholder="Pilih provinsi"
            />
            <ExportButtons onCsv={handleCsv} onPptx={handlePptx} />
          </>
        )}
      />

      <div className="page-wrap page-pad" style={{ paddingTop: 16, paddingBottom: 40 }}>
        {isNational ? (
          <NationalView
            provinces={sorted}
            nasional={nasional}
            ladder={ladder}
            kabkotAll={kabkotAll}
            ipal={ipal}
            iplt={iplt}
            theme={theme}
            onOpenProvince={(kode) => { setSelectedKode(String(kode).trim()); window.scrollTo(0, 0); }}
          />
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>

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

            {/* Tangga sanitasi (real ladder data) */}
            <SectionCard
              title="Tangga Sanitasi · 2025"
              subtitle='Sumber: sheet "Ladder Provinsi" — komposisi jenjang akses'
            >
              <LadderChart rungs={provLadder?.rungs} idKey={provKode} theme={theme} />
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
                      <div style={{ display: 'grid', gap: 4, maxWidth: 320 }}>
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

            {/* Priority issue cards */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 14.5, fontWeight: 600, margin: 0 }}>Isu Prioritas</h2>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Klik kab/kota untuk membuka profil</span>
              </div>
              <PriorityIssueCards
                kabsNoIPLT={kabsNoIPLT}
                babsHigh={babsHigh}
                amanLow={amanLow}
                onOpenKab={(k) => onNavigate(`/kabkota?provinsi=${encodeURIComponent(selectedProv.provinsi)}&kode=${encodeURIComponent(k.kode)}`)}
              />
              {brokenUnits.length > 0 && (
                <SectionCard style={{ marginTop: 16 }} title={`${brokenUnits.length} unit IPAL/IPLT tidak berfungsi`} subtitle="Perlu tindak lanjut operasional">
                  <div className="no-scrollbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
                    {brokenUnits.map((u) => (
                      <span key={u.id} className="chip chip-warn" style={{ fontSize: 10.5 }}>{u.type} · {u.nama}{u.kabkot ? ` (${u.kabkot})` : ''}</span>
                    ))}
                  </div>
                </SectionCard>
              )}
            </div>

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
        )}
      </div>
    </div>
  );
}


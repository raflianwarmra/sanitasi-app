import { useState, useEffect, useRef, useMemo } from 'react';
import { useIPAL, useIPLT, useLog, useKabkot } from '../hooks/useSheetData';
import { fmtNum, fmtPct, slugify } from '../lib/format';
import { downloadCsv } from '../lib/exportCsv';
import { computeInfraExecutiveSummary, coverageGaps, rankByRisk, utilizationPct as utilPct, statusOf, logsFor } from '../lib/infraSummary';
import Breadcrumb from '../components/Breadcrumb';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import MetricCard from '../components/MetricCard';
import EmptyState from '../components/EmptyState';
import { SkeletonPanel } from '../components/LoadingSpinner';
import SearchableSelect from '../components/SearchableSelect';
import ExportButtons from '../components/ExportButtons';
import InfraDetailPanel from '../components/InfraDetailPanel';
import Icon from '../components/Icon';
import { rowLinkProps } from '../hooks/useOverlay';
import { useTheme, cssVar } from '../lib/theme';

function hasRealCoords(infra) {
  return infra.lat != null && infra.lng != null && !isNaN(infra.lat) && !isNaN(infra.lng)
    && Math.abs(infra.lat) <= 90 && Math.abs(infra.lng) <= 180
    && !(infra.lat === 0 && infra.lng === 0);
}

// ── Main page ─────────────────────────────────────────────────
export default function Infrastruktur({ onNavigate }) {
  const { data: ipalData, loading: ipalLoading } = useIPAL();
  const { data: ipltData, loading: ipltLoading } = useIPLT();
  const { data: logs, reload: reloadLogs } = useLog();
  const { data: kabkotAll } = useKabkot();
  const { theme } = useTheme();
  const [view, setView] = useState('ringkasan'); // ringkasan | aset | catatan
  const [filter, setFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [filterProv, setFilterProv] = useState('');
  const [filterKab, setFilterKab] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [mapReady, setMapReady] = useState(() => !!window.L);
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersLayer = useRef(null);

  const allInfra = useMemo(() => [...ipalData, ...ipltData], [ipalData, ipltData]);
  const loading = ipalLoading || ipltLoading;

  const provinsiOptions = useMemo(() => Array.from(new Set(allInfra.map((i) => i.provinsi).filter(Boolean))).sort(), [allInfra]);
  const kabkotOptions = useMemo(() => {
    const pool = filterProv ? allInfra.filter((i) => i.provinsi === filterProv) : allInfra;
    return Array.from(new Set(pool.map((i) => i.kabkot).filter(Boolean))).sort();
  }, [allInfra, filterProv]);

  const filtered = useMemo(() => allInfra.filter((i) => {
    if (filter !== 'Semua' && i.type !== filter) return false;
    if (statusFilter === 'Beroperasi' && !i.isFunctioning) return false;
    if (statusFilter === 'Nonaktif' && i.isFunctioning) return false;
    if (filterProv && i.provinsi !== filterProv) return false;
    if (filterKab && i.kabkot !== filterKab) return false;
    if (search) {
      const q = search.toLowerCase();
      return (i.nama?.toLowerCase().includes(q) || i.kabkot?.toLowerCase().includes(q) || i.provinsi?.toLowerCase().includes(q));
    }
    return true;
  }), [allInfra, filter, statusFilter, filterProv, filterKab, search]);

  const mappable = useMemo(() => filtered.filter(hasRealCoords), [filtered]);
  const unmappedCount = filtered.length - mappable.length;

  // ── Executive summary + risk + coverage (modules A, C, D) ──
  const exec = useMemo(() => computeInfraExecutiveSummary(filtered), [filtered]);
  const atRisk = useMemo(() => rankByRisk(filtered, (i) => logsFor(logs, i)), [filtered, logs]);
  const kabScope = useMemo(
    () => (filterProv ? kabkotAll.filter((k) => k.provinsi === filterProv) : kabkotAll),
    [kabkotAll, filterProv],
  );
  const gapIPLT = useMemo(() => coverageGaps(kabScope, allInfra, 'IPLT'), [kabScope, allInfra]);
  const gapIPAL = useMemo(() => coverageGaps(kabScope, allInfra, 'IPAL'), [kabScope, allInfra]);

  const execSentence = exec.total
    ? `${fmtPct(exec.pctFunctioning, 0)} dari ${exec.total} unit tercatat berfungsi; `
      + `${atRisk.length} unit berisiko perlu perhatian; `
      + `${gapIPLT.length} kab/kota${filterProv ? ` di ${filterProv}` : ''} belum memiliki IPLT.`
    : 'Tidak ada unit pada cakupan filter ini.';

  // ── Aggregate notes feed (module B: Catatan tab) ──
  const logsFiltered = useMemo(() => {
    const q = search.toLowerCase();
    return logs
      .filter((l) => {
        if (filterProv && (l.provinsi || '').toLowerCase() !== filterProv.toLowerCase()) return false;
        if (filterKab && (l.kabkot || '').toLowerCase() !== filterKab.toLowerCase()) return false;
        if (q) {
          return (l.infrastruktur || '').toLowerCase().includes(q)
            || (l.kabkot || '').toLowerCase().includes(q)
            || (l.catatan || '').toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)));
  }, [logs, filterProv, filterKab, search]);

  // Per-type stats over the current filter.
  const stats = useMemo(() => {
    const mk = () => ({ count: 0, func: 0, notFunc: 0, cap: 0, capFunc: 0, idle: 0, served: 0, idleServed: 0, lowUtil: 0 });
    const out = { IPAL: mk(), IPLT: mk() };
    filtered.forEach((d) => {
      const s = out[d.type]; if (!s) return;
      s.count++;
      if (d.isFunctioning) s.func++; else s.notFunc++;
      s.cap += d.kapasitas ?? 0;
      if (d.isFunctioning) s.capFunc += d.kapasitas ?? 0;
      s.idle += d.idle ?? 0;
      s.served += d.sr ?? 0;
      if (d.kapasitas && d.idle) s.idleServed += (d.sr ?? 0) * (d.idle / d.kapasitas);
      const u = utilPct(d);
      if (u != null && u < 30) s.lowUtil++;
    });
    return out;
  }, [filtered]);

  // ── Leaflet (bundled, lazy-loaded chunk; map lives on the Ringkasan tab) ──
  // No third-party CDN at runtime: works on restricted office networks.
  useEffect(() => {
    if (window.L) return; // already loaded (state initialized lazily)
    let alive = true;
    Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]).then(([mod]) => {
      window.L = mod.default ?? mod;
      if (alive) setMapReady(true);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (view !== 'ringkasan') {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        markersLayer.current = null;
      }
      return;
    }
    if (!mapReady || !window.L || !mapRef.current || leafletMap.current) return;
    const map = window.L.map(mapRef.current, { zoomControl: true, attributionControl: false })
      .setView([-2.5, 118], 5);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    leafletMap.current = map;
    markersLayer.current = window.L.layerGroup().addTo(map);
  }, [mapReady, view]);

  useEffect(() => {
    if (view !== 'ringkasan' || !mapReady || !leafletMap.current || !markersLayer.current) return;
    markersLayer.current.clearLayers();
    const pts = [];
    mappable.forEach((infra) => {
      const color = cssVar(infra.isFunctioning ? '--ok' : '--bad');
      const ring = cssVar('--paper');
      let marker;
      if (infra.type === 'IPLT') {
        marker = window.L.marker([infra.lat, infra.lng], {
          title: `${infra.type} ${infra.nama}`,
          alt: `${infra.type} ${infra.nama}`,
          icon: window.L.divIcon({
            className: '',
            html: `<span style="display:block;width:11px;height:11px;background:${color};border:1.5px solid ${ring};border-radius:2px;box-shadow:0 1px 3px oklch(0% 0 0 / 0.35)"></span>`,
            iconSize: [11, 11], iconAnchor: [5.5, 5.5],
          }),
        }).addTo(markersLayer.current);
      } else {
        marker = window.L.circleMarker([infra.lat, infra.lng], {
          radius: 6, fillColor: color, color: ring, weight: 1.5, fillOpacity: 0.9,
        }).addTo(markersLayer.current);
      }
      marker.bindTooltip(
        `<b>${infra.nama}</b><br>${infra.type} · ${infra.kabkot}<br>${infra.statusText || (infra.isFunctioning ? 'Beroperasi' : 'Tidak berfungsi')}`,
        { direction: 'top' },
      );
      marker.on('click', () => setSelected(infra));
      pts.push([infra.lat, infra.lng]);
    });
    if (pts.length && (filterProv || filterKab)) {
      try { leafletMap.current.fitBounds(pts, { padding: [30, 30], maxZoom: 12 }); } catch { /* noop */ }
    }
  }, [mapReady, mappable, filterProv, filterKab, view, theme]);

  // ── CSV export of the filtered list ──
  const handleCsv = () => {
    const scope = filterKab || filterProv;
    const name = scope ? `sanitasi-infrastruktur-${slugify(scope)}` : 'sanitasi-infrastruktur-filtered';
    downloadCsv(name, [
      { key: 'type', label: 'Jenis' },
      { key: 'nama', label: 'Nama Unit' },
      { key: 'provinsi', label: 'Provinsi' },
      { key: 'kabkot', label: 'Kabupaten/Kota' },
      { key: 'kode', label: 'Kode Kab/Kota' },
      { key: 'tahun', label: 'Tahun Pembangunan' },
      { key: 'kapasitas', label: 'Kapasitas Desain (m³/hari)' },
      { key: 'terpakai', label: 'Kapasitas Terpakai (m³/hari)' },
      { key: 'sr', label: 'SR / KK Terlayani' },
      { key: 'status', label: 'Status Keberfungsian' },
      { key: 'catatan', label: 'Jumlah Catatan' },
    ], filtered.map((i) => ({
      type: i.type, nama: i.nama, provinsi: i.provinsi || '', kabkot: i.kabkot || '', kode: i.kode || '',
      tahun: i.tahunBangun || '', kapasitas: i.kapasitas ?? '', terpakai: i.kapasitasTerpakai ?? '',
      sr: i.sr ?? '', status: i.statusText || (i.isFunctioning ? 'Berfungsi' : 'Tidak berfungsi'),
      catatan: logsFor(logs, i).length || '',
    })));
  };

  const activeFilters = [filterProv, filterKab, filter !== 'Semua' && filter, statusFilter !== 'Semua' && statusFilter, search].filter(Boolean).length;
  const showPanel = selected && view !== 'catatan';

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Breadcrumb
        path={[{ label: 'Beranda', path: '/' }, 'Infrastruktur']}
        onNavigate={onNavigate}
      />

      <PageHeader
        context="Aset air limbah domestik"
        title="Infrastruktur Sanitasi"
        meta={`${allInfra.length} unit · ${ipalData.length} IPAL · ${ipltData.length} IPLT · ${logs.length} catatan lapangan`}
        controls={<ExportButtons onCsv={handleCsv} csvLabel="Unduh CSV (terfilter)" />}
      />

      {/* Filter toolbar */}
      <div className="page-wrap page-pad">
        <div className="card" role="search" aria-label="Filter infrastruktur" style={{ padding: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', overflow: 'visible' }}>
          <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 260 }}>
            <Icon name="search" size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
            <input
              className="input" style={{ paddingLeft: 32 }}
              placeholder="Cari nama / lokasi…"
              aria-label="Cari infrastruktur"
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <SearchableSelect
            style={{ width: 170, maxWidth: '100%' }}
            value={filterProv}
            onChange={(v) => { setFilterProv(v); setFilterKab(''); }}
            options={[{ value: '', label: 'Semua Provinsi' }, ...provinsiOptions.map((p) => ({ value: p, label: p }))]}
            placeholder="Semua Provinsi"
            ariaLabel="Provinsi"
          />
          <SearchableSelect
            style={{ width: 185, maxWidth: '100%' }}
            value={filterKab}
            onChange={setFilterKab}
            options={[{ value: '', label: 'Semua Kab/Kota' }, ...kabkotOptions.map((k) => ({ value: k, label: k }))]}
            placeholder="Semua Kab/Kota"
            ariaLabel="Kabupaten/kota"
          />
          <div className="seg" role="group" aria-label="Filter jenis">
            {['Semua', 'IPAL', 'IPLT'].map((t) => (
              <button key={t} type="button" aria-pressed={filter === t} onClick={() => setFilter(t)}>{t}</button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Filter status">
            {[['Semua', 'Semua Status'], ['Beroperasi', 'Beroperasi'], ['Nonaktif', 'Nonaktif']].map(([v, l]) => (
              <button key={v} type="button" aria-pressed={statusFilter === v} onClick={() => setStatusFilter(v)}>{l}</button>
            ))}
          </div>
          <span className="chip chip-accent" style={{ marginLeft: 'auto' }}>{filtered.length} unit</span>
          {activeFilters > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setFilterProv(''); setFilterKab(''); setFilter('Semua'); setStatusFilter('Semua'); setSearch(''); }}
            >
              <Icon name="x" size={12} />
              Hapus filter
            </button>
          )}
        </div>
      </div>

      {/* View tabs: Ringkasan / Aset / Catatan */}
      <div>
        <div className="page-wrap page-pad" style={{ paddingTop: 16 }}>
          <div className="seg" role="group" aria-label="Pilih tampilan">
            {[
              ['ringkasan', 'Ringkasan'],
              ['aset', `Aset (${filtered.length})`],
              ['catatan', `Catatan Lapangan (${logsFiltered.length})`],
            ].map(([v, l]) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="page-wrap page-pad" style={{ paddingTop: 20, paddingBottom: 48 }}>
          <SkeletonPanel rows={3} height={150} />
        </div>
      ) : (
        <div className={`page-wrap page-pad with-panel${showPanel ? ' is-open' : ''}`} style={{ paddingTop: 20, paddingBottom: 48 }}>
          <div className="stack" style={{ alignContent: 'start' }}>

            {/* ══ RINGKASAN ══ */}
            {view === 'ringkasan' && (
              <>
                <SectionCard title="Ringkasan Kondisi Aset" subtitle={filterProv ? `Cakupan filter: ${filterKab || filterProv}` : 'Cakupan: nasional'}>
                  <p className="text-lead" style={{ margin: '0 0 16px', maxWidth: '68ch' }}>
                    {execSentence}
                  </p>
                  <div className="metric-grid">
                    <MetricCard label="Total Unit" value={exec.total} unit="" sub={`${stats.IPAL.count} IPAL · ${stats.IPLT.count} IPLT`} />
                    <MetricCard label="Berfungsi" value={exec.pctFunctioning != null ? fmtPct(exec.pctFunctioning, 0) : null} sub={`${exec.functioning} unit`} tone="ok" />
                    <MetricCard label="Tidak Berfungsi" value={exec.notFunctioning} unit="" tone={exec.notFunctioning ? 'bad' : 'ok'} sub="perlu tindak lanjut" />
                    <MetricCard label="Utilisasi < 30%" value={exec.lowUtil} unit="" tone={exec.lowUtil ? 'warn' : 'ok'} sub="kapasitas idle besar" />
                  </div>
                </SectionCard>

                {/* At-risk list + coverage gaps */}
                <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 24 }}>
                  <SectionCard title="Unit Berisiko" subtitle="Prioritas perhatian — gabungan keberfungsian, utilisasi, umur, dan catatan">
                    {atRisk.length === 0 ? (
                      <EmptyState compact icon="check" title="Tidak ada unit berisiko tinggi" text="Semua unit pada cakupan ini dalam kondisi wajar." />
                    ) : (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {atRisk.map(({ infra, reasons }) => (
                          <button
                            key={infra.id}
                            type="button"
                            className="list-row"
                            onClick={() => setSelected(infra)}
                            style={{ display: 'grid', gap: 5, padding: '10px 12px', background: 'var(--paper-2)' }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                              <span className="chip">{infra.type}</span>
                              <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{infra.nama}</span>
                              <span className="text-caption" style={{ marginLeft: 'auto', flexShrink: 0 }}>{infra.kabkot}</span>
                            </span>
                            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                              {reasons.map((r) => (
                                <span key={r} className={`chip ${r === 'Tidak berfungsi' ? 'chip-bad' : 'chip-warn'}`}>{r}</span>
                              ))}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard title="Kesenjangan Cakupan" subtitle={filterProv ? `Kab/kota di ${filterProv}` : 'Seluruh kab/kota'}>
                    <div style={{ display: 'grid', gap: 14 }}>
                      {[
                        ['Tanpa IPLT', gapIPLT],
                        ['Tanpa IPAL tercatat', gapIPAL],
                      ].map(([label, gaps]) => (
                        <div key={label}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                            <span className="num-display" style={{ fontSize: '1.625rem', fontWeight: 600, color: gaps.length ? 'var(--warn)' : 'var(--ok)' }}>{gaps.length}</span>
                            <span className="section-label">{label}</span>
                            <span className="text-caption">dari {kabScope.length}</span>
                          </div>
                          {gaps.length > 0 && (
                            <div className="no-scrollbar" tabIndex={0} role="region" aria-label={`${label}: ${gaps.length} kab/kota`} style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 88, overflowY: 'auto', borderRadius: 8 }}>
                              {gaps.slice(0, 40).map((k) => (
                                <span key={k.kode} className="chip">{k.kabkot}</span>
                              ))}
                              {gaps.length > 40 && <span className="text-caption2">+{gaps.length - 40} lainnya</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                </div>

                {/* Map */}
                <SectionCard
                  title="Peta Infrastruktur"
                  pad={false}
                  actions={(
                    <div className="legend">
                      <span className="legend-item"><span className="legend-swatch" style={{ borderRadius: '50%', background: 'var(--ink-3)' }} />IPAL</span>
                      <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--ink-3)' }} />IPLT</span>
                      <span className="legend-item"><span className="legend-swatch" style={{ borderRadius: '50%', background: 'var(--ok)' }} />Beroperasi</span>
                      <span className="legend-item"><span className="legend-swatch" style={{ borderRadius: '50%', background: 'var(--bad)' }} />Nonaktif</span>
                      {unmappedCount > 0 && <span className="chip chip-warn">{unmappedCount} tanpa koordinat</span>}
                    </div>
                  )}
                >
                  <div ref={mapRef} className="map-frame" aria-label="Peta titik infrastruktur sanitasi" />
                </SectionCard>

                {/* Per-type summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                  {[
                    { type: 'IPLT', unit: 'KK', unitLong: 'Kepala Keluarga', s: stats.IPLT },
                    { type: 'IPAL', unit: 'SR', unitLong: 'Sambungan Rumah', s: stats.IPAL },
                  ].map(({ type, unit, unitLong, s }) => (
                    <SectionCard
                      key={type}
                      title={type === 'IPAL' ? 'IPAL — Air Limbah Domestik' : 'IPLT — Lumpur Tinja'}
                      actions={<span className="chip">{s.count} unit</span>}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                        <MetricCard label="Total unit" value={s.count} size={24} sub={`${s.func} berfungsi · ${s.notFunc} tidak`} />
                        <MetricCard label="Total kapasitas" value={fmtNum(s.cap)} unit="m³" size={24} sub={`Berfungsi: ${fmtNum(s.capFunc)} m³`} />
                        <MetricCard label="Kapasitas idle" value={fmtNum(s.idle)} unit="m³" size={24} sub={`Potensi: ${fmtNum(s.idleServed)} ${unit}`} />
                        <MetricCard label="Cakupan layanan" value={fmtNum(s.served)} unit={unit} size={24} sub={`${unitLong} terlayani`} />
                      </div>
                      {s.lowUtil > 0 && (
                        <div className="text-caption" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, color: 'var(--warn)' }}>
                          <Icon name="alert" size={13} />
                          {s.lowUtil} unit dengan utilisasi &lt; 30%
                        </div>
                      )}
                    </SectionCard>
                  ))}
                </div>
              </>
            )}

            {/* ══ ASET ══ */}
            {view === 'aset' && (
              <SectionCard title="Daftar Unit" pad={false}>
                <div className="table-scroll">
                  <table className="data-table" style={{ minWidth: 700 }}>
                    <thead>
                      <tr>
                        <th>Nama</th>
                        <th>Jenis</th>
                        <th>Lokasi</th>
                        <th className="td-num">Kapasitas</th>
                        <th className="td-num">Utilisasi</th>
                        <th>Status</th>
                        <th className="td-num">Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 100).map((infra, i) => {
                        const st = statusOf(infra);
                        const util = utilPct(infra);
                        const n = logsFor(logs, infra).length;
                        const isSel = selected && selected.nama === infra.nama && selected.kabkot === infra.kabkot;
                        return (
                          <tr
                            key={`${infra.type}-${infra.nama}-${i}`}
                            {...rowLinkProps(() => setSelected(infra))}
                            data-selected={isSel || undefined}
                          >
                            <td style={{ fontWeight: 500 }}>{infra.nama}</td>
                            <td><span className="chip">{infra.type}</span></td>
                            <td style={{ color: 'var(--ink-2)' }}>{infra.kabkot}</td>
                            <td className="td-num">{infra.kapasitas != null ? fmtNum(infra.kapasitas) : '—'}</td>
                            <td className="td-num" style={util != null && util < 30 ? { color: 'var(--warn)', fontWeight: 600 } : undefined}>
                              {util != null ? fmtPct(util, 0) : '—'}
                            </td>
                            <td>
                              <span className="status-label" style={{ color: st.color }}>
                                <span className="dot" style={{ background: st.color }} />
                                {st.label}
                              </span>
                            </td>
                            <td className="td-num" style={{ color: 'var(--ink-3)' }}>{n > 0 ? n : '—'}</td>
                          </tr>
                        );
                      })}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={7}>
                            <EmptyState
                              compact icon="search"
                              title="Tidak ada unit yang cocok"
                              text="Longgarkan filter atau ubah kata kunci pencarian."
                            />
                          </td>
                        </tr>
                      )}
                      {filtered.length > 100 && (
                        <tr>
                          <td colSpan={7} className="text-caption" style={{ textAlign: 'center' }}>
                            +{filtered.length - 100} unit lainnya — persempit dengan filter, atau unduh CSV untuk daftar lengkap.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}

            {/* ══ CATATAN LAPANGAN ══ */}
            {view === 'catatan' && (
              <SectionCard title="Catatan Lapangan" subtitle="Seluruh catatan monev, terbaru di atas — mengikuti filter provinsi/kab-kota dan pencarian">
                {logsFiltered.length === 0 ? (
                  <EmptyState
                    compact icon="clipboard"
                    title="Belum ada catatan pada cakupan ini"
                    text="Tambahkan catatan dari panel detail unit pada tab Aset."
                  />
                ) : (
                  <div tabIndex={0} role="region" aria-label="Daftar catatan lapangan" style={{ display: 'grid', gap: 8, maxHeight: 620, overflowY: 'auto', borderRadius: 14 }}>
                    {logsFiltered.slice(0, 100).map((l) => (
                      <div key={l.id} className="inset inset-sm">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span className="num" style={{ fontSize: '0.78125rem', fontWeight: 600 }}>{l.tanggal || '—'}</span>
                          {l.type && <span className="chip">{l.type}</span>}
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{l.infrastruktur || '—'}</span>
                          <span className="text-caption">{l.kabkot}</span>
                          {l.sumber && <span className="chip chip-accent" style={{ marginLeft: 'auto' }}>{l.sumber}</span>}
                        </div>
                        <div className="text-body">{l.catatan}</div>
                        {l.user && <div className="text-caption2" style={{ marginTop: 4 }}>oleh {l.user}</div>}
                      </div>
                    ))}
                    {logsFiltered.length > 100 && (
                      <div className="text-caption" style={{ textAlign: 'center', padding: 6 }}>
                        +{logsFiltered.length - 100} catatan lainnya — persempit dengan filter.
                      </div>
                    )}
                  </div>
                )}
              </SectionCard>
            )}
          </div>

          {showPanel && (
            <div className="card side-panel">
              <InfraDetailPanel
                infra={selected}
                logs={logs}
                onClose={() => setSelected(null)}
                reloadLogs={reloadLogs}
              />
            </div>
          )}
        </div>
      )}

    </div>
  );
}

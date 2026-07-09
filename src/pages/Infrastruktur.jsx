import { useState, useEffect, useRef, useMemo } from 'react';
import { useIPAL, useIPLT, useLog, useKabkot } from '../hooks/useSheetData';
import { fmtNum, fmtPct, slugify } from '../lib/format';
import { downloadCsv } from '../lib/exportCsv';
import { computeInfraExecutiveSummary, coverageGaps, rankByRisk, utilizationPct as utilPct } from '../lib/infraSummary';
import Breadcrumb from '../components/Breadcrumb';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import MetricCard from '../components/MetricCard';
import EmptyState from '../components/EmptyState';
import { SkeletonPanel } from '../components/LoadingSpinner';
import LogCatatanForm from '../components/LogCatatanForm';
import LogCatatanList from '../components/LogCatatanList';
import SearchableSelect from '../components/SearchableSelect';
import ExportButtons from '../components/ExportButtons';
import Icon from '../components/Icon';

function statusOf(infra) {
  if (!infra.statusText && infra.isFunctioning == null) return { color: 'var(--ink-3)', label: 'Tidak diketahui', ok: null };
  return infra.isFunctioning
    ? { color: 'var(--ok)', label: 'Beroperasi', ok: true }
    : { color: 'var(--bad)', label: 'Tidak berfungsi', ok: false };
}

function logsFor(logs, infra) {
  const name = (infra.nama || '').toLowerCase();
  const kk = (infra.kabkot || '').toLowerCase();
  return logs.filter((l) => {
    const lName = (l.infrastruktur || '').toLowerCase();
    const lKk = (l.kabkot || '').toLowerCase();
    return lName && lName === name && (!kk || !lKk || lKk === kk);
  });
}

function hasRealCoords(infra) {
  return infra.lat != null && infra.lng != null && !isNaN(infra.lat) && !isNaN(infra.lng)
    && Math.abs(infra.lat) <= 90 && Math.abs(infra.lng) <= 180
    && !(infra.lat === 0 && infra.lng === 0);
}

// ── Detail side panel ──────────────────────────────────────────
function InfraPanel({ infra, logs, onClose, reloadLogs }) {
  const [tab, setTab] = useState('detail');
  const related = logsFor(logs, infra);
  const status = statusOf(infra);
  const util = utilPct(infra);

  if (tab === 'addlog') {
    return (
      <LogCatatanForm
        infra={infra}
        onClose={() => setTab('catatan')}
        onSuccess={() => { reloadLogs?.(); }}
      />
    );
  }

  return (
    <div>
      <div style={{ padding: 16, borderBottom: '1px solid var(--line-2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'start' }}>
          <span className="chip chip-accent">{infra.type}</span>
          <button
            onClick={onClose} aria-label="Tutup panel detail"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4, lineHeight: 0 }}
          >
            <Icon name="x" size={17} />
          </button>
        </div>
        <div style={{ fontWeight: 600, fontSize: 15.5, marginBottom: 2 }}>{infra.nama}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          {infra.kabkot}{infra.provinsi ? ` · ${infra.provinsi}` : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <span className="dot" style={{ background: status.color }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: status.color }}>{status.label}</span>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--line-2)' }} role="tablist">
        {[['detail', 'Detail'], ['catatan', `Catatan (${related.length})`]].map(([v, l]) => (
          <button
            key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
            style={{
              padding: '10px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              background: 'transparent', border: 'none', fontFamily: 'inherit',
              color: tab === v ? 'var(--ink)' : 'var(--ink-3)',
              borderBottom: `2px solid ${tab === v ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1,
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === 'detail' && (
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              ['Kode Kab/Kota', infra.kode || '—', true],
              ['Tahun Bangun', infra.tahunBangun || '—'],
              ['Kapasitas Desain', infra.kapasitas != null ? `${fmtNum(infra.kapasitas)} m³/hari` : '—'],
              ['Kapasitas Terpakai', infra.kapasitasTerpakai != null ? `${fmtNum(infra.kapasitasTerpakai)} m³/hari` : '—'],
              ['Utilisasi', util != null ? fmtPct(util, 1) : '—'],
              [infra.type === 'IPAL' ? 'Sambungan Rumah (SR)' : 'KK Terlayani', infra.sr != null ? fmtNum(infra.sr) : '—'],
              ['Status Serah Terima', infra.statusSerah || '—'],
              ['Status Keberfungsian', infra.statusText || '—'],
            ].map(([l, v, mono]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5, borderBottom: '1px dashed var(--line-2)', paddingBottom: 6 }}>
                <span style={{ color: 'var(--ink-3)' }}>{l}</span>
                <span className={mono ? 'mono' : 'num'} style={{ fontWeight: 600, fontSize: 12, textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>

          {util != null && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 4 }}>
                <span>Utilisasi kapasitas</span>
                <span className="num" style={{ fontWeight: 600, color: 'var(--ink)' }}>{fmtPct(util, 1)}</span>
              </div>
              <div style={{ height: 8, background: 'var(--line-2)', borderRadius: 4, overflow: 'hidden' }} role="img" aria-label={`Utilisasi ${fmtPct(util, 1)}`}>
                <div style={{
                  width: `${Math.min(util, 100)}%`, height: '100%', borderRadius: 4,
                  background: util < 30 ? 'var(--warn)' : 'var(--accent)',
                }} />
              </div>
              {util < 30 && (
                <div style={{ fontSize: 11, color: 'var(--warn)', marginTop: 4 }}>
                  Utilisasi rendah — kapasitas idle besar.
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <button className="btn btn-accent" style={{ width: '100%' }} onClick={() => setTab('addlog')}>
              <Icon name="plus" size={14} />
              Tambah Catatan
            </button>
          </div>
        </div>
      )}

      {tab === 'catatan' && (
        <div style={{ padding: 16 }}>
          <LogCatatanList logs={related} emptyText="Belum ada catatan untuk infrastruktur ini." />
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-accent" style={{ width: '100%' }} onClick={() => setTab('addlog')}>
              <Icon name="plus" size={14} />
              Tambah Catatan Baru
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function Infrastruktur({ onNavigate }) {
  const { data: ipalData, loading: ipalLoading } = useIPAL();
  const { data: ipltData, loading: ipltLoading } = useIPLT();
  const { data: logs, reload: reloadLogs } = useLog();
  const { data: kabkotAll } = useKabkot();
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

  // ── Leaflet (CDN, lazy; map lives on the Ringkasan tab) ──
  useEffect(() => {
    if (window.L) return; // already loaded (state initialized lazily)
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setMapReady(true);
    document.head.appendChild(script);
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
      const color = infra.isFunctioning ? '#2E7D53' : '#C23B3B';
      let marker;
      if (infra.type === 'IPLT') {
        marker = window.L.marker([infra.lat, infra.lng], {
          icon: window.L.divIcon({
            className: '',
            html: `<span style="display:block;width:11px;height:11px;background:${color};border:1.5px solid white;border-radius:2px;box-shadow:0 1px 3px rgba(0,0,0,0.35)"></span>`,
            iconSize: [11, 11], iconAnchor: [5.5, 5.5],
          }),
        }).addTo(markersLayer.current);
      } else {
        marker = window.L.circleMarker([infra.lat, infra.lng], {
          radius: 6, fillColor: color, color: 'white', weight: 1.5, fillOpacity: 0.9,
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
  }, [mapReady, mappable, filterProv, filterKab, view]);

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
        kicker="Aset Air Limbah Domestik"
        title="Infrastruktur Sanitasi"
        meta={`${allInfra.length} unit · ${ipalData.length} IPAL · ${ipltData.length} IPLT · ${logs.length} catatan lapangan`}
        controls={<ExportButtons onCsv={handleCsv} csvLabel="Unduh CSV (terfilter)" />}
      />

      {/* Filter bar */}
      <div style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)' }}>
        <div className="page-wrap page-pad" style={{ paddingTop: 12, paddingBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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
            style={{ width: 170 }}
            value={filterProv}
            onChange={(v) => { setFilterProv(v); setFilterKab(''); }}
            options={[{ value: '', label: 'Semua Provinsi' }, ...provinsiOptions.map((p) => ({ value: p, label: p }))]}
            placeholder="Semua Provinsi"
          />
          <SearchableSelect
            style={{ width: 185 }}
            value={filterKab}
            onChange={setFilterKab}
            options={[{ value: '', label: 'Semua Kab/Kota' }, ...kabkotOptions.map((k) => ({ value: k, label: k }))]}
            placeholder="Semua Kab/Kota"
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
      <div style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)' }}>
        <div className="page-wrap page-pad" style={{ paddingTop: 10, paddingBottom: 10 }}>
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
        <div className="page-wrap page-pad" style={{ paddingTop: 16, paddingBottom: 40 }}>
          <SkeletonPanel rows={3} height={150} />
        </div>
      ) : (
        <div className="page-wrap page-pad" style={{ paddingTop: 16, paddingBottom: 40, display: 'grid', gridTemplateColumns: showPanel ? 'minmax(0, 1fr) 360px' : 'minmax(0, 1fr)', gap: 16 }} data-panel-open={!!showPanel}>
          <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>

            {/* ══ RINGKASAN ══ */}
            {view === 'ringkasan' && (
              <>
                <SectionCard title="Ringkasan Kondisi Aset" subtitle={filterProv ? `Cakupan filter: ${filterKab || filterProv}` : 'Cakupan: nasional'}>
                  <p style={{ margin: '0 0 14px', fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: 640 }}>
                    {execSentence}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                    <MetricCard label="Total Unit" value={exec.total} unit="" sub={`${stats.IPAL.count} IPAL · ${stats.IPLT.count} IPLT`} />
                    <MetricCard label="Berfungsi" value={exec.pctFunctioning != null ? fmtPct(exec.pctFunctioning, 0) : null} sub={`${exec.functioning} unit`} tone="ok" />
                    <MetricCard label="Tidak Berfungsi" value={exec.notFunctioning} unit="" tone={exec.notFunctioning ? 'bad' : 'ok'} sub="perlu tindak lanjut" />
                    <MetricCard label="Utilisasi < 30%" value={exec.lowUtil} unit="" tone={exec.lowUtil ? 'warn' : 'ok'} sub="kapasitas idle besar" />
                  </div>
                </SectionCard>

                {/* At-risk list + coverage gaps */}
                <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
                  <SectionCard title="Unit Berisiko" subtitle="Prioritas perhatian — gabungan keberfungsian, utilisasi, umur, dan catatan">
                    {atRisk.length === 0 ? (
                      <EmptyState compact icon="check" title="Tidak ada unit berisiko tinggi" text="Semua unit pada cakupan ini dalam kondisi wajar." />
                    ) : (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {atRisk.map(({ infra, reasons }) => (
                          <button
                            key={infra.id}
                            type="button"
                            onClick={() => setSelected(infra)}
                            style={{
                              all: 'unset', cursor: 'pointer', padding: '9px 11px',
                              border: '1px solid var(--line-2)', borderRadius: 7, display: 'grid', gap: 5,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-2)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                              <span className="chip" style={{ fontSize: 10 }}>{infra.type}</span>
                              <span style={{ fontWeight: 600, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{infra.nama}</span>
                              <span style={{ fontSize: 11.5, color: 'var(--ink-3)', marginLeft: 'auto', flexShrink: 0 }}>{infra.kabkot}</span>
                            </span>
                            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                              {reasons.map((r) => (
                                <span key={r} className={`chip ${r === 'Tidak berfungsi' ? 'chip-bad' : 'chip-warn'}`} style={{ fontSize: 10 }}>{r}</span>
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
                            <span className="num" style={{ fontSize: 22, fontWeight: 700, color: gaps.length ? 'var(--warn)' : 'var(--ok)' }}>{gaps.length}</span>
                            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</span>
                            <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>dari {kabScope.length}</span>
                          </div>
                          {gaps.length > 0 && (
                            <div className="no-scrollbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 88, overflowY: 'auto' }}>
                              {gaps.slice(0, 40).map((k) => (
                                <span key={k.kode} className="chip" style={{ fontSize: 10 }}>{k.kabkot}</span>
                              ))}
                              {gaps.length > 40 && <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>+{gaps.length - 40} lainnya</span>}
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
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 11, color: 'var(--ink-2)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--ink-3)', display: 'inline-block' }} />IPAL
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--ink-3)', display: 'inline-block' }} />IPLT
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--ok)' }}>
                        <span className="dot" style={{ background: 'var(--ok)' }} />Beroperasi
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--bad)' }}>
                        <span className="dot" style={{ background: 'var(--bad)' }} />Nonaktif
                      </span>
                      {unmappedCount > 0 && (
                        <span className="chip chip-warn" style={{ fontSize: 10 }}>{unmappedCount} tanpa koordinat</span>
                      )}
                    </div>
                  )}
                >
                  <div ref={mapRef} style={{ height: 340, background: 'var(--line-2)' }} aria-label="Peta titik infrastruktur sanitasi" />
                </SectionCard>

                {/* Per-type summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  {[
                    { type: 'IPLT', unit: 'KK', unitLong: 'Kepala Keluarga', s: stats.IPLT },
                    { type: 'IPAL', unit: 'SR', unitLong: 'Sambungan Rumah', s: stats.IPAL },
                  ].map(({ type, unit, unitLong, s }) => (
                    <SectionCard
                      key={type}
                      title={type === 'IPAL' ? 'IPAL — Air Limbah Domestik' : 'IPLT — Lumpur Tinja'}
                      actions={<span className="chip">{s.count} unit</span>}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                        <div className="kpi" style={{ padding: 11 }}>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>Total Unit</div>
                          <div className="num" style={{ fontSize: 21, fontWeight: 700 }}>{s.count}</div>
                          <div style={{ fontSize: 11, marginTop: 2 }}>
                            <span style={{ color: 'var(--ok)' }}>{s.func} berfungsi</span>
                            {' · '}
                            <span style={{ color: s.notFunc ? 'var(--bad)' : 'var(--ink-3)' }}>{s.notFunc} tidak</span>
                          </div>
                        </div>
                        <div className="kpi" style={{ padding: 11 }}>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>Total Kapasitas</div>
                          <div className="num" style={{ fontSize: 21, fontWeight: 700 }}>
                            {fmtNum(s.cap)}<span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}> m³</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>Berfungsi: {fmtNum(s.capFunc)} m³</div>
                        </div>
                        <div className="kpi" style={{ padding: 11 }}>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>Kapasitas Idle</div>
                          <div className="num" style={{ fontSize: 21, fontWeight: 700 }}>
                            {fmtNum(s.idle)}<span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}> m³</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>Potensi: {fmtNum(s.idleServed)} {unit}</div>
                        </div>
                        <div className="kpi" style={{ padding: 11 }}>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>Cakupan Layanan</div>
                          <div className="num" style={{ fontSize: 21, fontWeight: 700 }}>
                            {fmtNum(s.served)}<span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}> {unit}</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{unitLong} terlayani</div>
                        </div>
                      </div>
                      {s.lowUtil > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 11.5, color: 'var(--warn)' }}>
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
                            tabIndex={0}
                            onClick={() => setSelected(infra)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(infra); } }}
                            style={{ cursor: 'pointer', background: isSel ? 'var(--accent-soft)' : undefined }}
                            aria-selected={isSel || undefined}
                          >
                            <td style={{ fontWeight: 500 }}>{infra.nama}</td>
                            <td><span className="chip" style={{ fontSize: 10.5 }}>{infra.type}</span></td>
                            <td style={{ color: 'var(--ink-2)' }}>{infra.kabkot}</td>
                            <td className="td-num">{infra.kapasitas != null ? fmtNum(infra.kapasitas) : '—'}</td>
                            <td className="td-num" style={util != null && util < 30 ? { color: 'var(--warn)', fontWeight: 600 } : undefined}>
                              {util != null ? fmtPct(util, 0) : '—'}
                            </td>
                            <td>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: st.color }}>
                                <span className="dot" style={{ background: st.color, width: 7, height: 7 }} />
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
                          <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 11.5 }}>
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
                  <div style={{ display: 'grid', gap: 8, maxHeight: 620, overflowY: 'auto' }}>
                    {logsFiltered.slice(0, 100).map((l) => (
                      <div key={l.id} style={{ padding: '10px 12px', border: '1px solid var(--line-2)', borderRadius: 7 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span className="num" style={{ fontSize: 11.5, fontWeight: 600 }}>{l.tanggal || '—'}</span>
                          {l.type && <span className="chip" style={{ fontSize: 10 }}>{l.type}</span>}
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{l.infrastruktur || '—'}</span>
                          <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{l.kabkot}</span>
                          {l.sumber && <span className="chip chip-accent" style={{ fontSize: 10, marginLeft: 'auto' }}>{l.sumber}</span>}
                        </div>
                        <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{l.catatan}</div>
                        {l.user && <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 4 }}>oleh {l.user}</div>}
                      </div>
                    ))}
                    {logsFiltered.length > 100 && (
                      <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--ink-3)', padding: 6 }}>
                        +{logsFiltered.length - 100} catatan lainnya — persempit dengan filter.
                      </div>
                    )}
                  </div>
                )}
              </SectionCard>
            )}
          </div>

          {showPanel && (
            <div className="card fade-in" style={{ padding: 0, alignSelf: 'start', position: 'sticky', top: 72 }}>
              <InfraPanel
                infra={selected}
                logs={logs}
                onClose={() => setSelected(null)}
                reloadLogs={reloadLogs}
              />
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          [data-panel-open="true"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

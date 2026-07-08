import { useState, useEffect, useRef, useMemo } from 'react';
import { useIPAL, useIPLT, useLog } from '../hooks/useSheetData';
import { fmtNum, fmtPct, slugify } from '../lib/format';
import { downloadCsv } from '../lib/exportCsv';
import Breadcrumb from '../components/Breadcrumb';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
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

function utilPct(infra) {
  if (!infra.kapasitas || infra.kapasitasTerpakai == null) return null;
  return (infra.kapasitasTerpakai / infra.kapasitas) * 100;
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

  // ── Leaflet (CDN, lazy) ──
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
    if (!mapReady || !window.L || !mapRef.current || leafletMap.current) return;
    const map = window.L.map(mapRef.current, { zoomControl: true, attributionControl: false })
      .setView([-2.5, 118], 5);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    leafletMap.current = map;
    markersLayer.current = window.L.layerGroup().addTo(map);
  }, [mapReady]);

  useEffect(() => {
    if (!mapReady || !leafletMap.current || !markersLayer.current) return;
    markersLayer.current.clearLayers();
    const pts = [];
    mappable.forEach((infra) => {
      const color = infra.isFunctioning ? '#2E7D53' : '#C23B3B';
      let marker;
      if (infra.type === 'IPLT') {
        // IPLT = square marker (shape distinguishes type; color = status)
        marker = window.L.marker([infra.lat, infra.lng], {
          icon: window.L.divIcon({
            className: '',
            html: `<span style="display:block;width:11px;height:11px;background:${color};border:1.5px solid white;border-radius:2px;box-shadow:0 1px 3px rgba(0,0,0,0.35)"></span>`,
            iconSize: [11, 11], iconAnchor: [5.5, 5.5],
          }),
        }).addTo(markersLayer.current);
      } else {
        // IPAL = circle marker
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
  }, [mapReady, mappable, filterProv, filterKab]);

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
          <span className="chip chip-accent" style={{ marginLeft: 'auto' }}>{filtered.length} unit ditampilkan</span>
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

      {loading ? (
        <div className="page-wrap page-pad" style={{ paddingTop: 16, paddingBottom: 40 }}>
          <SkeletonPanel rows={3} height={150} />
        </div>
      ) : (
        <div className="page-wrap page-pad" style={{ paddingTop: 16, paddingBottom: 40, display: 'grid', gridTemplateColumns: selected ? 'minmax(0, 1fr) 360px' : 'minmax(0, 1fr)', gap: 16 }} data-panel-open={!!selected}>
          <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>

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

            {/* Table */}
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
          </div>

          {selected && (
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

      {/* On mobile the detail panel stacks below; ensure grid collapses */}
      <style>{`
        @media (max-width: 900px) {
          [data-panel-open="true"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

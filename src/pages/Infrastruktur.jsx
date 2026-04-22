import { useState, useEffect, useRef, useMemo } from 'react';
import { useIPAL, useIPLT, useLog } from '../hooks/useSheetData';
import Breadcrumb from '../components/Breadcrumb';
import LoadingSpinner from '../components/LoadingSpinner';
import LogCatatanForm from '../components/LogCatatanForm';
import LogCatatanList from '../components/LogCatatanList';
import SearchableSelect from '../components/SearchableSelect';

function statusStyle(isFunctioning, statusText) {
  if (!statusText) return { color: 'var(--ink-3)', label: 'Tidak diketahui' };
  const t = statusText.toLowerCase();
  if (t.includes('tidak') || t.includes('non')) return { color: 'var(--bad)', label: 'Nonaktif / Bermasalah' };
  return { color: 'var(--ok)', label: 'Beroperasi' };
}

function utilPct(infra) {
  if (!infra.kapasitas || !infra.kapasitasTerpakai) return null;
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

function InfraPanel({ infra, logs, onClose, reloadLogs }) {
  const [tab, setTab] = useState('detail');
  const related = logsFor(logs, infra);
  const status = statusStyle(infra.isFunctioning, infra.statusText);
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
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{infra.nama}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>
          {infra.kabkot}{infra.provinsi ? ` · ${infra.provinsi}` : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: status.color }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: status.color }}>{status.label}</span>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--line-2)' }}>
        {[['detail', 'Detail'], ['catatan', `Catatan (${related.length})`]].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} style={{
            padding: '10px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: 'transparent', border: 'none', fontFamily: 'inherit',
            color: tab === v ? 'var(--ink)' : 'var(--ink-3)',
            borderBottom: `2px solid ${tab === v ? 'var(--accent)' : 'transparent'}`,
            marginBottom: -1,
          }}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'detail' && (
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              ['Kode Kab/Kota', infra.kode || '—'],
              ['Tahun Bangun', infra.tahunBangun || '—'],
              ['Kapasitas Desain', infra.kapasitas != null ? `${infra.kapasitas} m³/hari` : '—'],
              ['Kapasitas Terpakai', infra.kapasitasTerpakai != null ? `${infra.kapasitasTerpakai} m³/hari` : '—'],
              ['Utilisasi', util != null ? `${util.toFixed(1)}%` : '—'],
              [infra.type === 'IPAL' ? 'Sambungan Rumah (SR)' : 'KK Terlayani', infra.sr ?? '—'],
              ['Status Serah Terima', infra.statusSerah || '—'],
              ['Status Keberfungsian', infra.statusText || '—'],
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: '1px dashed var(--line-2)', paddingBottom: 6 }}>
                <span style={{ color: 'var(--ink-3)' }}>{l}</span>
                <span style={{ fontWeight: 600, fontFamily: 'JetBrains Mono', fontSize: 11, textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-accent" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setTab('addlog')}>
              + Tambah Catatan
            </button>
          </div>
        </div>
      )}

      {tab === 'catatan' && (
        <div style={{ padding: 16 }}>
          <LogCatatanList logs={related} emptyText="Belum ada catatan untuk infrastruktur ini." />
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-accent" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setTab('addlog')}>
              + Tambah Catatan Baru
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function hasRealCoords(infra) {
  return infra.lat != null && infra.lng != null && !isNaN(infra.lat) && !isNaN(infra.lng)
    && Math.abs(infra.lat) <= 90 && Math.abs(infra.lng) <= 180
    && !(infra.lat === 0 && infra.lng === 0);
}

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
  const [mapReady, setMapReady] = useState(false);
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

  // v1-style infrastructure statistics (per type)
  const stats = useMemo(() => {
    const mk = () => ({ count: 0, func: 0, notFunc: 0, cap: 0, capFunc: 0, idle: 0, served: 0, idleServed: 0 });
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
    });
    return out;
  }, [filtered]);

  const fmt = (n) => Math.round(n).toLocaleString('id-ID');

  useEffect(() => {
    if (window.L) { setMapReady((r) => r || true); return; }
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
      const color = infra.isFunctioning ? '#22c55e' : '#ef4444';
      const marker = window.L.circleMarker([infra.lat, infra.lng], {
        radius: infra.type === 'IPAL' ? 7 : 5,
        fillColor: color, color: 'white', weight: 1.5, fillOpacity: 0.85,
      }).addTo(markersLayer.current);
      marker.bindTooltip(
        `<b>${infra.nama}</b><br>${infra.kabkot}<br>${infra.statusText || (infra.isFunctioning ? 'Beroperasi' : 'Nonaktif')}`,
        { direction: 'top' }
      );
      marker.on('click', () => setSelected(infra));
      pts.push([infra.lat, infra.lng]);
    });
    if (pts.length && (filterProv || filterKab)) {
      try { leafletMap.current.fitBounds(pts, { padding: [30, 30], maxZoom: 12 }); } catch {}
    }
  }, [mapReady, mappable, filterProv, filterKab]);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Breadcrumb
        path={[{ label: 'Beranda', path: '/' }, 'Data Infrastruktur']}
        onNavigate={onNavigate}
      />

      <div className="page-pad" style={{ paddingTop: 16, paddingBottom: 10, background: 'var(--paper)', borderBottom: '1.5px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>Infrastruktur Sanitasi</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
              {allInfra.length} titik · {ipalData.length} IPAL · {ipltData.length} IPLT · {logs.length} catatan
            </div>
          </div>
          <input className="input" style={{ width: 240 }} placeholder="Cari nama / lokasi..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchableSelect
            style={{ width: 180 }}
            value={filterProv}
            onChange={(v) => { setFilterProv(v); setFilterKab(''); }}
            options={[{ value: '', label: 'Semua Provinsi' }, ...provinsiOptions.map((p) => ({ value: p, label: p }))]}
            placeholder="Semua Provinsi"
          />
          <SearchableSelect
            style={{ width: 200 }}
            value={filterKab}
            onChange={setFilterKab}
            options={[{ value: '', label: 'Semua Kab/Kota' }, ...kabkotOptions.map((k) => ({ value: k, label: k }))]}
            placeholder="Semua Kab/Kota"
          />
          <span style={{ width: 1, background: 'var(--line)', margin: '0 2px', alignSelf: 'stretch' }} />
          {['Semua', 'IPAL', 'IPLT'].map((t) => (
            <button key={t} className={`btn ${filter === t ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ padding: '5px 12px', fontSize: 11 }}
              onClick={() => setFilter(t)}>{t}
            </button>
          ))}
          <span style={{ width: 1, background: 'var(--line)', margin: '0 2px', alignSelf: 'stretch' }} />
          {[['Semua','Semua Status'], ['Beroperasi','● Beroperasi'], ['Nonaktif','● Nonaktif']].map(([v, l]) => (
            <button key={v} className={`btn ${statusFilter === v ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ padding: '5px 12px', fontSize: 11 }}
              onClick={() => setStatusFilter(v)}>{l}
            </button>
          ))}
          <span className="chip chip-accent" style={{ marginLeft: 'auto' }}>{filtered.length} ditampilkan</span>
          {(filterProv || filterKab) && (
            <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => { setFilterProv(''); setFilterKab(''); }}>× Hapus filter</button>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Memuat data infrastruktur..." />
      ) : (
        <div className="page-pad" style={{ paddingBottom: 32, display: 'grid', gridTemplateColumns: selected ? 'minmax(0, 1fr) 360px' : 'minmax(0, 1fr)', gap: 16 }}>
          <div>
            {/* v1-style statistics: IPLT row + IPAL row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 16 }}>
              {[
                { type: 'IPLT', accent: '#6366f1', unit: 'KK', unitLong: 'Kepala Keluarga', s: stats.IPLT },
                { type: 'IPAL', accent: '#0d9488', unit: 'SR', unitLong: 'Sambungan Rumah', s: stats.IPAL },
              ].map(({ type, accent, unit, unitLong, s }) => (
                <div key={type} className="card" style={{ borderTop: `4px solid ${accent}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{type === 'IPAL' ? 'IPAL (Air Limbah Domestik)' : 'IPLT (Lumpur Tinja)'}</div>
                    <span className="chip" style={{ background: accent, color: 'white', fontSize: 10 }}>{s.count} unit</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    <div className="kpi" style={{ padding: 10 }}>
                      <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>Total Unit</div>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>{s.count}</div>
                      <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', marginTop: 2 }}>
                        <span style={{ color: 'var(--ok)' }}>{s.func} Berfungsi</span> · <span style={{ color: 'var(--bad)' }}>{s.notFunc} Tidak</span>
                      </div>
                    </div>
                    <div className="kpi" style={{ padding: 10 }}>
                      <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>Total Kapasitas</div>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(s.cap)}<span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}> m³</span></div>
                      <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', marginTop: 2 }}>Fungsi: {fmt(s.capFunc)}</div>
                    </div>
                    <div className="kpi" style={{ padding: 10 }}>
                      <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>Idle Capacity</div>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(s.idle)}<span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}> m³</span></div>
                      <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', marginTop: 2 }}>Potensi: {fmt(s.idleServed)} {unit}</div>
                    </div>
                    <div className="kpi" style={{ padding: 10 }}>
                      <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>Cakupan Layanan</div>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(s.served)}<span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}> {unit}</span></div>
                      <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', marginTop: 2 }}>{unitLong} Terlayani</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Peta Infrastruktur</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {unmappedCount > 0 && (
                    <span className="chip chip-warn" style={{ fontSize: 10 }}>{unmappedCount} tanpa koordinat</span>
                  )}
                  <span className="chip chip-ok" style={{ fontSize: 10 }}>● Beroperasi</span>
                  <span className="chip chip-bad" style={{ fontSize: 10 }}>● Nonaktif</span>
                </div>
              </div>
              <div ref={mapRef} style={{ height: 320, background: 'var(--line-2)' }} />
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="data-table" style={{ minWidth: 640 }}>
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Jenis</th>
                    <th>Lokasi</th>
                    <th>Kapasitas</th>
                    <th>Status</th>
                    <th>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 100).map((infra, i) => {
                    const st = statusStyle(infra.isFunctioning, infra.statusText);
                    const n = logsFor(logs, infra).length;
                    return (
                      <tr key={i}
                        style={{ background: selected?.id === infra.id ? 'var(--accent-soft)' : '' }}
                        onClick={() => setSelected(infra)}
                      >
                        <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 12 }}>{infra.nama}</td>
                        <td><span className="chip" style={{ fontSize: 10 }}>{infra.type}</span></td>
                        <td style={{ fontSize: 12 }}>{infra.kabkot}</td>
                        <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{infra.kapasitas ?? '—'}</td>
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 11, color: st.color,
                            fontFamily: 'JetBrains Mono', fontWeight: 600,
                          }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.color }} />
                            {st.label}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--ink-3)' }}>
                          {n > 0 ? `${n} catatan` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 24, fontStyle: 'italic' }}>
                      Tidak ada data yang sesuai filter.
                    </td></tr>
                  )}
                  {filtered.length > 100 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 10, fontSize: 11, fontFamily: 'JetBrains Mono' }}>
                      +{filtered.length - 100} data lainnya · gunakan filter untuk mempersempit
                    </td></tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
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
    </div>
  );
}

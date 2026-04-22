import { useState, useEffect, useRef } from 'react';
import { useIPAL, useIPLT, useLog } from '../hooks/useSheetData';
import { appendLog } from '../lib/sheets';
import Breadcrumb from '../components/Breadcrumb';
import LoadingSpinner, { ErrorCard } from '../components/LoadingSpinner';

function statusStyle(isFunctioning, statusText) {
  if (!statusText) return { color: 'var(--ink-3)', bg: 'var(--line-2)', label: 'Tidak diketahui' };
  const text = statusText.toLowerCase();
  if (text.includes('tidak')) return { color: 'var(--bad)', bg: 'var(--bad-soft)', label: 'Nonaktif / Bermasalah' };
  return { color: 'var(--ok)', bg: 'var(--ok-soft)', label: 'Beroperasi' };
}

// ── Log history panel ──────────────────────────────────────────
function LogHistory({ infraId, logs, onClose }) {
  const infraLogs = logs.filter((l) => l.idInfra === infraId || l.idInfra === String(infraId));

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Riwayat Catatan</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{infraId}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 1 }}>×</button>
      </div>

      {infraLogs.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic', padding: '12px 0' }}>
          Belum ada catatan untuk infrastruktur ini.
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 26, maxHeight: 280, overflowY: 'auto' }} className="no-scrollbar">
          <div style={{ position: 'absolute', left: 9, top: 0, bottom: 0, width: 2, background: 'var(--line)' }} />
          {infraLogs.map((log, i) => (
            <div key={i} style={{ position: 'relative', paddingBottom: 14 }}>
              <div style={{
                position: 'absolute', left: -22, top: 3,
                width: 12, height: 12, borderRadius: '50%',
                background: 'var(--paper)', border: '2px solid var(--accent)',
              }} />
              <div className="card" style={{ padding: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 600 }}>{log.tanggal}</span>
                  <span className="chip chip-accent" style={{ fontSize: 10 }}>{log.sumber}</span>
                  {log.user && <span style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 'auto', fontFamily: 'JetBrains Mono' }}>oleh {log.user}</span>}
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--ink)' }}>{log.catatan}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Add Log form ───────────────────────────────────────────────
function AddLogForm({ infra, onClose, onSuccess }) {
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const [tanggal, setTanggal] = useState(today);
  const [sumber, setSumber] = useState('');
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sumber || !catatan.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await appendLog({
        idInfra: infra.nama || infra.id,
        tanggal,
        sumber,
        catatan: catatan.trim(),
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--accent)', letterSpacing: '0.08em' }}>TAMBAH CATATAN / LOG</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{infra.nama || infra.id}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>
            {infra.kabkot} · {infra.type}
          </div>
        </div>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label className="field-label">Tanggal</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input className="input" value={tanggal} onChange={(e) => setTanggal(e.target.value)} style={{ flex: 1 }} />
            <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>auto · dpt diubah</span>
          </div>
        </div>

        <div>
          <label className="field-label">Sumber Informasi</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {['Laporan', 'Monev', 'Lainnya'].map((opt) => (
              <button
                key={opt} type="button"
                className={`btn ${sumber === opt ? 'btn-secondary' : 'btn-ghost'}`}
                style={{ justifyContent: 'center', padding: '8px', fontSize: 12 }}
                onClick={() => setSumber(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="field-label">Catatan</label>
          <textarea
            className="input"
            rows={4}
            placeholder="Tuliskan catatan lapangan, temuan, atau tindakan..."
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', background: 'var(--line-2)', padding: '8px 10px', borderRadius: 4 }}>
          → Disimpan ke Google Sheet · sheet "log infrastruktur"
        </div>

        {saveError && (
          <div style={{ fontSize: 11, color: 'var(--bad)', fontFamily: 'JetBrains Mono' }}>
            Gagal menyimpan: {saveError}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button
            type="submit" className="btn btn-accent"
            disabled={!sumber || !catatan.trim() || saving}
            style={{ opacity: (!sumber || !catatan.trim() || saving) ? 0.5 : 1 }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Log'}
          </button>
        </div>
      </div>
    </form>
  );
}

// ── Infra detail popup / side panel ──────────────────────────
function InfraPanel({ infra, logs, onClose, onNavigate }) {
  const [view, setView] = useState('detail'); // 'detail' | 'log' | 'addlog'
  const infraLogs = logs.filter((l) => l.idInfra === infra.nama || l.idInfra === infra.id);
  const status = statusStyle(infra.isFunctioning, infra.statusText);

  if (view === 'addlog') {
    return (
      <AddLogForm
        infra={infra}
        onClose={() => setView('detail')}
        onSuccess={() => setView('log')}
      />
    );
  }

  if (view === 'log') {
    return (
      <div>
        <LogHistory infraId={infra.nama || infra.id} logs={logs} onClose={() => setView('detail')} />
        <div style={{ padding: '0 16px 16px' }}>
          <button className="btn btn-accent" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setView('addlog')}>
            + Tambah Catatan Baru
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'start' }}>
        <span className="chip chip-accent">{infra.type} · Sanitasi</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 1 }}>×</button>
      </div>

      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{infra.nama || infra.id}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginBottom: 14 }}>
        {infra.kabkot}{infra.provinsi ? ` · ${infra.provinsi}` : ''}
      </div>

      <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
        {[
          ['Kapasitas', infra.kapasitas ? `${infra.kapasitas}` : '—'],
          ['Sambungan', infra.sr ? `${infra.sr}` : '—'],
          ['Tahun Bangun', infra.tahunBangun || '—'],
          ['Status', infra.statusText || '—'],
        ].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: '1px dashed var(--line-2)', paddingBottom: 6 }}>
            <span style={{ color: 'var(--ink-3)' }}>{l}</span>
            <span style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: status.color }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: status.color }}>{status.label}</span>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <button className="btn btn-accent" style={{ justifyContent: 'center' }} onClick={() => setView('addlog')}>
          + Tambah Catatan
        </button>
        <button className="btn btn-ghost" style={{ justifyContent: 'center' }} onClick={() => setView('log')}>
          Riwayat Log ({infraLogs.length})
        </button>
      </div>
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
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersLayer = useRef(null);

  const allInfra = [...ipalData, ...ipltData];
  const loading = ipalLoading || ipltLoading;

  // Filter
  const filtered = allInfra.filter((i) => {
    if (filter !== 'Semua' && i.type !== filter) return false;
    if (statusFilter === 'Beroperasi' && !i.isFunctioning) return false;
    if (statusFilter === 'Nonaktif' && i.isFunctioning) return false;
    if (search) {
      const q = search.toLowerCase();
      return (i.nama?.toLowerCase().includes(q) || i.kabkot?.toLowerCase().includes(q) || i.provinsi?.toLowerCase().includes(q));
    }
    return true;
  });

  // Load Leaflet
  useEffect(() => {
    if (window.L) { setMapReady(false); setTimeout(() => setMapReady(true), 50); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setMapReady(false);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!window.L || !mapRef.current || mapReady) return;
    const map = window.L.map(mapRef.current, { zoomControl: true, attributionControl: false })
      .setView([-2.5, 118], 5);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    leafletMap.current = map;
    markersLayer.current = window.L.layerGroup().addTo(map);
    setMapReady(true);
    return () => { map.remove(); leafletMap.current = null; };
  }, []);

  // Place markers — use province center coords + small random offset as proxy
  const PROV_BASE = { 'DKI Jakarta': [-6.21, 106.84], 'Jawa Barat': [-7.09, 107.67], 'Jawa Tengah': [-7.15, 110.14], 'Jawa Timur': [-7.54, 112.24], 'Bali': [-8.34, 115.09], 'Sumatera Utara': [2.11, 99.54], 'Sumatera Selatan': [-3.32, 103.91], 'Sulawesi Selatan': [-3.66, 119.97], 'Kalimantan Timur': [0.54, 116.42] };

  useEffect(() => {
    if (!mapReady || !leafletMap.current || !markersLayer.current || !filtered.length) return;
    markersLayer.current.clearLayers();
    filtered.forEach((infra, idx) => {
      const base = Object.entries(PROV_BASE).find(([k]) => infra.provinsi?.includes(k) || k.includes(infra.provinsi ?? ''))?.[1] ?? [-2.5 + (idx % 20) * 0.3, 118 + (idx % 15) * 0.4];
      const lat = base[0] + (((infra.id ?? idx) * 0.17) % 0.8 - 0.4);
      const lng = base[1] + (((infra.id ?? idx) * 0.23) % 0.8 - 0.4);

      const color = infra.isFunctioning ? '#22c55e' : '#ef4444';
      const marker = window.L.circleMarker([lat, lng], {
        radius: infra.type === 'IPAL' ? 7 : 5,
        fillColor: color, color: 'white', weight: 1.5, fillOpacity: 0.85,
      }).addTo(markersLayer.current);

      marker.bindTooltip(
        `<b>${infra.nama || infra.id}</b><br>${infra.kabkot}<br>${infra.statusText || (infra.isFunctioning ? 'Beroperasi' : 'Nonaktif')}`,
        { direction: 'top' }
      );
      marker.on('click', () => setSelected(infra));
    });
  }, [mapReady, filtered]);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Breadcrumb
        path={[{ label: 'Beranda', path: '/' }, 'Data Infrastruktur']}
        onNavigate={onNavigate}
      />

      {/* Header + filters */}
      <div style={{ padding: '16px 24px 10px', background: 'var(--paper)', borderBottom: '1.5px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>Infrastruktur Sanitasi</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{allInfra.length} titik · {ipalData.length} IPAL · {ipltData.length} IPLT</div>
          </div>
          <input className="input" style={{ width: 240 }} placeholder="Cari nama / lokasi..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {['Semua', 'IPAL', 'IPLT'].map((t) => (
            <button key={t} className={`btn ${filter === t ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ padding: '5px 12px', fontSize: 11 }}
              onClick={() => setFilter(t)}>{t}
            </button>
          ))}
          <span style={{ width: 1, background: 'var(--line)', margin: '0 4px' }} />
          {[['Semua','Semua Status'], ['Beroperasi','● Beroperasi'], ['Nonaktif','● Nonaktif']].map(([v, l]) => (
            <button key={v} className={`btn ${statusFilter === v ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ padding: '5px 12px', fontSize: 11 }}
              onClick={() => setStatusFilter(v)}>{l}
            </button>
          ))}
          <span className="chip chip-accent" style={{ marginLeft: 'auto' }}>{filtered.length} ditampilkan</span>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Memuat data infrastruktur..." />
      ) : (
        <div style={{ padding: '16px 24px 32px', display: 'grid', gridTemplateColumns: selected ? '1fr 360px' : '1fr', gap: 16 }}>
          {/* Left: map + table */}
          <div>
            {/* Map */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Peta Infrastruktur</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="chip chip-ok" style={{ fontSize: 10 }}>● Beroperasi</span>
                  <span className="chip chip-bad" style={{ fontSize: 10 }}>● Nonaktif</span>
                </div>
              </div>
              <div ref={mapRef} style={{ height: 300, background: 'var(--line-2)' }} />
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID / Nama</th>
                    <th>Jenis</th>
                    <th>Lokasi</th>
                    <th>Kapasitas</th>
                    <th>Status</th>
                    <th>Log</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 50).map((infra, i) => {
                    const status = statusStyle(infra.isFunctioning, infra.statusText);
                    const infraLogs = logs.filter((l) => l.idInfra === infra.nama || l.idInfra === infra.id);
                    return (
                      <tr key={i}
                        style={{ background: selected?.nama === infra.nama ? 'var(--accent-soft)' : '' }}
                        onClick={() => setSelected(infra)}
                      >
                        <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 12 }}>
                          {infra.nama || infra.id}
                        </td>
                        <td>
                          <span className="chip" style={{ fontSize: 10 }}>{infra.type}</span>
                        </td>
                        <td style={{ fontSize: 12 }}>{infra.kabkot}</td>
                        <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{infra.kapasitas ?? '—'}</td>
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 11, color: status.color,
                            fontFamily: 'JetBrains Mono', fontWeight: 600,
                          }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: status.color, flexShrink: 0 }} />
                            {status.label}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--ink-3)' }}>
                          {infraLogs.length > 0 ? `${infraLogs.length} catatan` : '—'}
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '3px 8px', fontSize: 10 }}
                            onClick={(e) => { e.stopPropagation(); setSelected({ ...infra, _openAddLog: true }); }}
                          >
                            + Log
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 24, fontStyle: 'italic' }}>
                        Tidak ada data yang sesuai filter.
                      </td>
                    </tr>
                  )}
                  {filtered.length > 50 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 10, fontSize: 11, fontFamily: 'JetBrains Mono' }}>
                        +{filtered.length - 50} data lainnya · gunakan filter untuk mempersempit
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: detail panel */}
          {selected && (
            <div className="card fade-in" style={{ padding: 0, alignSelf: 'start', position: 'sticky', top: 72 }}>
              <InfraPanel
                infra={selected}
                logs={logs}
                onClose={() => setSelected(null)}
                onNavigate={onNavigate}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useProvinsi } from '../hooks/useSheetData';
import Breadcrumb from '../components/Breadcrumb';
import KpiCard from '../components/KpiCard';
import LoadingSpinner, { ErrorCard } from '../components/LoadingSpinner';

// Indonesia province coordinates (center points for choropleth bubbles)
const PROV_COORDS = {
  'Aceh': [-4.69, 96.74],
  'Sumatera Utara': [2.11, 99.54],
  'Sumatera Barat': [-0.74, 100.18],
  'Riau': [0.54, 101.45],
  'Kepulauan Riau': [3.94, 108.14],
  'Jambi': [-1.59, 103.01],
  'Sumatera Selatan': [-3.32, 103.91],
  'Kepulauan Bangka Belitung': [-2.74, 106.44],
  'Bengkulu': [-3.80, 102.27],
  'Lampung': [-4.56, 105.41],
  'Banten': [-6.40, 106.07],
  'DKI Jakarta': [-6.21, 106.84],
  'Jawa Barat': [-7.09, 107.67],
  'Jawa Tengah': [-7.15, 110.14],
  'DI Yogyakarta': [-7.80, 110.36],
  'Jawa Timur': [-7.54, 112.24],
  'Bali': [-8.34, 115.09],
  'Nusa Tenggara Barat': [-8.65, 117.36],
  'Nusa Tenggara Timur': [-8.66, 121.08],
  'Kalimantan Barat': [0.00, 109.33],
  'Kalimantan Tengah': [-1.68, 113.38],
  'Kalimantan Selatan': [-3.09, 115.28],
  'Kalimantan Timur': [0.54, 116.42],
  'Kalimantan Utara': [3.07, 116.05],
  'Sulawesi Utara': [0.63, 123.97],
  'Gorontalo': [0.55, 123.06],
  'Sulawesi Tengah': [-1.43, 121.44],
  'Sulawesi Barat': [-2.84, 119.23],
  'Sulawesi Selatan': [-3.66, 119.97],
  'Sulawesi Tenggara': [-4.14, 122.17],
  'Maluku': [-3.24, 130.14],
  'Maluku Utara': [1.57, 127.80],
  'Papua Barat': [-1.34, 133.17],
  'Papua': [-4.27, 138.08],
  'Papua Tengah': [-4.00, 136.00],
  'Papua Pegunungan': [-4.50, 139.00],
  'Papua Selatan': [-7.00, 139.00],
};

function getCoords(provinsi) {
  const key = Object.keys(PROV_COORDS).find((k) => provinsi?.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(provinsi?.toLowerCase()));
  return key ? PROV_COORDS[key] : null;
}

function statusColor(value) {
  if (value == null) return 'var(--ink-3)';
  if (value >= 85) return 'var(--ok)';
  if (value >= 70) return 'var(--warn)';
  return 'var(--bad)';
}

export default function Provinsi({ onNavigate }) {
  const { data: allProvinsi, loading, error, reload } = useProvinsi();
  const [selected, setSelected] = useState(null);
  const [sortBy, setSortBy] = useState('layak2024');
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersLayer = useRef(null);

  const sorted = [...allProvinsi].sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0));
  const selectedProv = selected ?? sorted[0];

  // Leaflet map
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

  // Update markers
  useEffect(() => {
    if (!mapReady || !leafletMap.current || !markersLayer.current || !allProvinsi.length) return;
    markersLayer.current.clearLayers();
    allProvinsi.forEach((prov) => {
      const coords = getCoords(prov.provinsi);
      if (!coords) return;
      const value = prov.layak2024 ?? 0;
      const color = statusColor(value);
      const circle = window.L.circleMarker(coords, {
        radius: 8, fillColor: color, color: 'white', weight: 1.5, fillOpacity: 0.85,
      }).addTo(markersLayer.current);
      circle.bindTooltip(
        `<b>${prov.provinsi}</b><br>Layak: ${value ?? '—'}%<br>Aman: ${prov.aman2024 ?? '—'}%`,
        { permanent: false, direction: 'top' }
      );
      circle.on('click', () => setSelected(prov));
    });
  }, [mapReady, allProvinsi]);

  if (loading) return <LoadingSpinner text="Memuat data provinsi..." />;
  if (error) return <ErrorCard message={error} onRetry={reload} />;

  const yoyLayak = selectedProv?.layak2024 != null && selectedProv?.layak2024 > 0 && selectedProv?.layak2023 != null
    ? `${(selectedProv.layak2024 - selectedProv.layak2023) > 0 ? '+' : ''}${(selectedProv.layak2024 - selectedProv.layak2023).toFixed(1)}pp YoY`
    : null;
  const yoyAman = selectedProv?.aman2024 != null && selectedProv?.aman2023 != null
    ? `${(selectedProv.aman2024 - selectedProv.aman2023) > 0 ? '+' : ''}${(selectedProv.aman2024 - selectedProv.aman2023).toFixed(1)}pp YoY`
    : null;

  const rank = sorted.findIndex((p) => p.provinsi === selectedProv?.provinsi) + 1;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Breadcrumb
        path={[
          { label: 'Beranda', path: '/' },
          { label: 'Profil Provinsi', path: '/provinsi' },
          selectedProv?.provinsi && { label: selectedProv.provinsi },
        ].filter(Boolean)}
        onNavigate={onNavigate}
      />

      {/* Header */}
      <div style={{ padding: '20px 24px 10px', background: 'var(--paper)', borderBottom: '1.5px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>Profil Provinsi</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Data sanitasi {allProvinsi.length} provinsi · 2025</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            className="input"
            style={{ width: 200 }}
            value={selectedProv?.provinsi ?? ''}
            onChange={(e) => setSelected(allProvinsi.find((p) => p.provinsi === e.target.value) ?? null)}
          >
            <option value="">Pilih Provinsi</option>
            {sorted.map((p) => (
              <option key={p.provinsi} value={p.provinsi}>{p.provinsi}</option>
            ))}
          </select>
          <select className="input" style={{ width: 100 }}><option>2025</option><option>2024</option></select>
        </div>
      </div>

      {/* KPI strip */}
      {selectedProv && (
        <div style={{ padding: '12px 24px', background: 'var(--paper)', borderBottom: '1.5px solid var(--line)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          <KpiCard label="Akses Layak" value={selectedProv.layak2024?.toFixed(1)} delta={yoyLayak} />
          <KpiCard label="Akses Aman" value={selectedProv.aman2024?.toFixed(1)} delta={yoyAman} />
          <KpiCard label="BABS" value={selectedProv.babs2024?.toFixed(1)} deltaGood={false} />
          <KpiCard label="Peringkat Nasional" value={rank > 0 ? `#${rank}` : '—'} unit="" />
          {selectedProv.targetRpjmn && (
            <KpiCard
              label="Gap ke Target RPJMN"
              value={selectedProv.layak2024 != null ? (selectedProv.targetRpjmn - selectedProv.layak2024).toFixed(1) : null}
            />
          )}
        </div>
      )}

      {/* Map + ranking */}
      <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        {/* Map */}
        <div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Peta Akses Sanitasi</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="chip chip-ok" style={{ fontSize: 10 }}>● ≥85%</span>
                <span className="chip chip-warn" style={{ fontSize: 10 }}>● 70–85%</span>
                <span className="chip chip-bad" style={{ fontSize: 10 }}>● &lt;70%</span>
              </div>
            </div>
            <div ref={mapRef} style={{ height: 380, background: 'var(--line-2)' }} />
          </div>
        </div>

        {/* Ranking table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Peringkat Provinsi</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[['layak2024','Layak'], ['aman2024','Aman'], ['babs2024','BABS']].map(([k,l]) => (
                <button key={k} className={`btn ${sortBy === k ? 'btn-secondary' : 'btn-ghost'}`}
                  style={{ padding: '4px 8px', fontSize: 10 }}
                  onClick={() => setSortBy(k)}>{l}
                </button>
              ))}
            </div>
          </div>
          <div style={{ maxHeight: 380, overflowY: 'auto' }} className="no-scrollbar">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>#</th>
                  <th>Provinsi</th>
                  <th style={{ width: 80 }}>{sortBy === 'layak2024' ? 'Layak' : sortBy === 'aman2024' ? 'Aman' : 'BABS'}</th>
                  <th style={{ width: 24 }}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, i) => {
                  const val = p[sortBy];
                  return (
                    <tr key={p.provinsi}
                      style={{ background: selectedProv?.provinsi === p.provinsi ? 'var(--accent-soft)' : '' }}
                      onClick={() => setSelected(p)}
                    >
                      <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', fontSize: 11 }}>{i + 1}</td>
                      <td style={{ fontWeight: 600, fontSize: 12 }}>
                        {p.provinsi}
                        {selectedProv?.provinsi === p.provinsi && (
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', marginLeft: 6 }} />
                        )}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>{val != null ? `${val.toFixed(1)}%` : '—'}</td>
                      <td>
                        <div style={{ height: 6, background: 'var(--line-2)', borderRadius: 3, overflow: 'hidden', width: 50 }}>
                          <div style={{ width: `${Math.min(val ?? 0, 100)}%`, height: '100%', background: statusColor(val) }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Kab/kota list for selected province */}
      {selectedProv && (
        <div style={{ padding: '0 24px 32px' }}>
          <button
            className="btn btn-accent"
            onClick={() => onNavigate(`/kabkota?provinsi=${encodeURIComponent(selectedProv.provinsi)}`)}
            style={{ fontSize: 12 }}
          >
            Lihat Profil Kab/Kota di {selectedProv.provinsi} →
          </button>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo, useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';
import { useProvinsi, useKabkot, useIPAL, useIPLT } from '../hooks/useSheetData';
import Breadcrumb from '../components/Breadcrumb';
import LoadingSpinner, { ErrorCard } from '../components/LoadingSpinner';
import SearchableSelect from '../components/SearchableSelect';

function fmtPct(v, digits = 2) { return v == null ? '—' : `${v.toFixed(digits)}%`; }
function statusColor(v) {
  if (v == null) return 'var(--ink-3)';
  if (v >= 85) return 'var(--ok)';
  if (v >= 70) return 'var(--warn)';
  return 'var(--bad)';
}

// ── KPI card with Chart.js canvas ──
function KpiCard({ title, accent, current, target, children, canvasRef }) {
  return (
    <div className="card" style={{ borderTop: `4px solid ${accent}`, display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 8, borderBottom: '1px solid var(--line-2)', marginTop: 6 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Capaian 2025</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: accent, lineHeight: 1.1 }}>{current != null ? `${current.toFixed(2)}%` : '—'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Target 2029</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}>{target != null ? `${Number(target).toFixed(1)}%` : '—'}</div>
          </div>
        </div>
        {children}
      </div>
      <div style={{ position: 'relative', flexGrow: 1, minHeight: 220 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

export default function Provinsi({ onNavigate }) {
  const { data: provinces, loading: lP, error: eP, reload } = useProvinsi();
  const { data: kabkotAll } = useKabkot();
  const { data: ipal } = useIPAL();
  const { data: iplt } = useIPLT();

  const [selected, setSelected] = useState(null);
  const [sortBy, setSortBy] = useState('aman');
  const [sortDir, setSortDir] = useState('desc');

  const sorted = useMemo(() => [...provinces].sort((a, b) => (b.layak2025 ?? 0) - (a.layak2025 ?? 0)), [provinces]);
  const selectedProv = selected ?? sorted[0];

  const kabsInProv = useMemo(() => {
    if (!selectedProv) return [];
    const name = selectedProv.provinsi.toLowerCase();
    return kabkotAll.filter((k) => k.provinsi?.toLowerCase().includes(name) || name.includes(k.provinsi?.toLowerCase() ?? '__'));
  }, [kabkotAll, selectedProv]);

  const ipalHere = useMemo(() => ipal.filter((i) => i.provinsi && selectedProv?.provinsi && i.provinsi.toLowerCase().includes(selectedProv.provinsi.toLowerCase())), [ipal, selectedProv]);
  const ipltHere = useMemo(() => iplt.filter((i) => i.provinsi && selectedProv?.provinsi && i.provinsi.toLowerCase().includes(selectedProv.provinsi.toLowerCase())), [iplt, selectedProv]);

  const iTotal = ipltHere.length;
  const iGood = ipltHere.filter((x) => x.isFunctioning).length;
  const iBad = iTotal - iGood;
  const aTotal = ipalHere.length;
  const aGood = ipalHere.filter((x) => x.isFunctioning).length;
  const aBad = aTotal - aGood;

  const kabsNoIPLT = useMemo(() => {
    if (!kabsInProv.length) return [];
    const haveIPLT = new Set(ipltHere.map((i) => String(i.kode)));
    return kabsInProv.filter((k) => !haveIPLT.has(String(k.kode)));
  }, [kabsInProv, ipltHere]);

  const brokenUnits = useMemo(() => [
    ...ipltHere.filter((x) => !x.isFunctioning).map((x) => ({ ...x, typ: 'IPLT' })),
    ...ipalHere.filter((x) => !x.isFunctioning).map((x) => ({ ...x, typ: 'IPAL' })),
  ], [ipltHere, ipalHere]);

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

  // ── Chart.js refs + effect ──
  const canvasLayak = useRef(null);
  const canvasAman = useRef(null);
  const canvasBabs = useRef(null);
  const canvasLadder = useRef(null);
  const canvasGeo = useRef(null);
  const chartsRef = useRef({});

  useEffect(() => {
    if (!selectedProv) return;

    // Destroy previous charts
    Object.values(chartsRef.current).forEach((c) => c?.destroy?.());
    chartsRef.current = {};

    const years = [2022, 2023, 2024, 2025];
    const hist = {
      layak: years.map((y) => selectedProv.layak[`y${y}`]),
      aman: years.map((y) => selectedProv.aman[`y${y}`]),
      babs: years.map((y) => selectedProv.babs[`y${y}`]),
    };

    const commonOpts = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)', borderDash: [2, 4] }, ticks: { font: { size: 10 } } },
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      },
    };

    // Layak — bar
    if (canvasLayak.current) {
      chartsRef.current.layak = new Chart(canvasLayak.current, {
        type: 'bar',
        data: {
          labels: years,
          datasets: [{ label: 'Layak (Termasuk Aman)', data: hist.layak, backgroundColor: '#8b5cf6', borderRadius: 4 }],
        },
        options: commonOpts,
      });
    }

    // Aman — bar with dashed target bars
    if (canvasAman.current) {
      const labels = [...years, 'Target 2026', 'Target 2029'];
      const values = [...hist.aman, selectedProv.aman.target2026, selectedProv.aman.target2029];
      chartsRef.current.aman = new Chart(canvasAman.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Aman',
            data: values,
            backgroundColor: values.map((_, i) => i < years.length ? '#14b8a6' : 'transparent'),
            borderColor: '#14b8a6',
            borderWidth: 2,
            borderRadius: 4,
            borderSkipped: false,
          }],
        },
        options: commonOpts,
      });
    }

    // BABS — line with dashed projection
    if (canvasBabs.current) {
      const labels = [...years, 'Target 2026', 'Target 2029'];
      const values = [...hist.babs, selectedProv.babs.target2026, selectedProv.babs.target2029];
      const historyCount = years.length;
      chartsRef.current.babs = new Chart(canvasBabs.current, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'BABS',
            data: values,
            borderColor: '#ec4899',
            backgroundColor: '#ec4899',
            tension: 0.1,
            pointRadius: 4,
            segment: {
              borderDash: (c) => c.p0DataIndex >= (historyCount - 1) ? [6, 6] : undefined,
            },
          }],
        },
        options: commonOpts,
      });
    }

    // Ladder Sanitasi — horizontal stacked bar
    if (canvasLadder.current) {
      const aman = selectedProv.aman.y2025 ?? 0;
      const layak = selectedProv.layak.y2025 ?? 0;
      const babs = selectedProv.babs.y2025 ?? 0;
      const layakNon = Math.max(0, layak - aman);
      const gap = Math.max(0, 100 - layak - babs);
      chartsRef.current.ladder = new Chart(canvasLadder.current, {
        type: 'bar',
        data: {
          labels: ['2025'],
          datasets: [
            { label: 'Akses Aman', data: [aman], backgroundColor: '#0d9488' },
            { label: 'Layak (Non-Aman)', data: [layakNon], backgroundColor: '#6366f1' },
            { label: 'Dasar / Belum Layak', data: [gap], backgroundColor: '#cbd5e1' },
            { label: 'BABS Terbuka', data: [babs], backgroundColor: '#f43f5e' },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: { x: { stacked: true, display: false, max: 100 }, y: { stacked: true, display: false } },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw).toFixed(2)}%`,
              },
            },
          },
        },
      });
    }

    // Geographic — per kab/kota stacked
    if (canvasGeo.current && kabsInProv.length) {
      const s = [...kabsInProv].sort((a, b) => (b.layak2025 ?? 0) - (a.layak2025 ?? 0));
      chartsRef.current.geo = new Chart(canvasGeo.current, {
        type: 'bar',
        data: {
          labels: s.map((k) => k.kabkot),
          datasets: [
            { label: 'Akses Aman', data: s.map((k) => k.aman2025 ?? 0), backgroundColor: '#0d9488', stack: 'main', barPercentage: 0.75 },
            { label: 'Akses Layak (Non-Aman)', data: s.map((k) => Math.max(0, (k.layak2025 ?? 0) - (k.aman2025 ?? 0))), backgroundColor: '#8b5cf6', stack: 'main', barPercentage: 0.75 },
            { label: 'BABS', data: s.map((k) => k.babs2025 ?? 0), backgroundColor: '#ec4899', stack: 'main', barPercentage: 0.75 },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { stacked: true, max: 120, title: { display: true, text: 'Persentase (%)', font: { size: 11 } }, ticks: { font: { size: 10 } } },
            y: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw).toFixed(2)}%`,
                footer: (items) => {
                  let aman = 0, layakNon = 0;
                  items.forEach((t) => {
                    if (t.dataset.label === 'Akses Aman') aman = Number(t.raw) || 0;
                    if (t.dataset.label === 'Akses Layak (Non-Aman)') layakNon = Number(t.raw) || 0;
                  });
                  return 'Total Akses Layak: ' + (aman + layakNon).toFixed(2) + '%';
                },
              },
            },
          },
        },
      });
    }

    return () => {
      Object.values(chartsRef.current).forEach((c) => c?.destroy?.());
      chartsRef.current = {};
    };
  }, [selectedProv, kabsInProv]);

  if (lP) return <LoadingSpinner text="Memuat data provinsi..." />;
  if (eP) return <ErrorCard message={eP} onRetry={reload} />;
  if (!selectedProv) return <div style={{ padding: 48, textAlign: 'center' }}>Tidak ada data provinsi.</div>;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Breadcrumb
        path={[
          { label: 'Beranda', path: '/' },
          { label: 'Profil Provinsi', path: '/provinsi' },
          { label: selectedProv.provinsi },
        ]}
        onNavigate={onNavigate}
      />

      {/* Header */}
      <div className="page-pad" style={{ paddingTop: 20, paddingBottom: 20, background: 'var(--paper)', borderBottom: '1.5px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', marginBottom: 4 }}>
            DASHBOARD KINERJA SANITASI DAERAH
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>{selectedProv.provinsi}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Monitoring Akses Layak, Aman, BABS & Infrastruktur · Data 2025</div>
        </div>
        <SearchableSelect
          style={{ width: 240 }}
          value={selectedProv.provinsi}
          onChange={(v) => setSelected(provinces.find((p) => p.provinsi === v) ?? null)}
          options={sorted.map((p) => p.provinsi)}
          placeholder="Pilih provinsi"
        />
      </div>

      {/* KPI Cards with Chart.js */}
      <div className="page-pad" style={{ paddingTop: 16, paddingBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <KpiCard title="Akses Layak (Termasuk Aman)" accent="#8b5cf6" current={selectedProv.layak.y2025} target={100} canvasRef={canvasLayak} />
        <KpiCard title="Akses Aman" accent="#14b8a6" current={selectedProv.aman.y2025} target={selectedProv.aman.target2029} canvasRef={canvasAman}>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginTop: 4 }}>
            Target 2026: {fmtPct(selectedProv.aman.target2026)}
          </div>
        </KpiCard>
        <KpiCard title="BABS Terbuka" accent="#ec4899" current={selectedProv.babs.y2025} target={selectedProv.babs.target2029} canvasRef={canvasBabs}>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginTop: 4 }}>
            Target 2026: {fmtPct(selectedProv.babs.target2026)}
          </div>
        </KpiCard>
      </div>

      {/* Ladder Sanitasi */}
      <div className="page-pad" style={{ paddingBottom: 16 }}>
        <div className="card" style={{ borderTop: '4px solid #3b82f6' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Ladder Sanitasi · 2025</div>
          <div style={{ height: 80, position: 'relative' }}>
            <canvas ref={canvasLadder} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10 }}>
            {[
              ['#0d9488', 'Akses Aman', selectedProv.aman.y2025],
              ['#6366f1', 'Layak (Non-Aman)', Math.max(0, (selectedProv.layak.y2025 ?? 0) - (selectedProv.aman.y2025 ?? 0))],
              ['#cbd5e1', 'Dasar / Belum Layak', Math.max(0, 100 - (selectedProv.layak.y2025 ?? 0) - (selectedProv.babs.y2025 ?? 0))],
              ['#f43f5e', 'BABS Terbuka', selectedProv.babs.y2025],
            ].map(([c, l, v]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <span style={{ width: 10, height: 10, background: c, borderRadius: 2 }} />
                <span>{l}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700 }}>{Number(v ?? 0).toFixed(2)}%</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginTop: 8 }}>
            *Kalkulasi: Layak (excl. Aman) = Layak − Aman. Sisa = Akses Dasar/Belum Layak.
          </div>
        </div>
      </div>

      {/* Infrastructure Summary */}
      <div className="page-pad" style={{ paddingBottom: 16 }}>
        <div className="card" style={{ borderTop: '4px solid #f59e0b' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Data Infrastruktur IPAL & IPLT</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
            <div className="kpi" style={{ borderLeft: '3px solid #f59e0b' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>Total IPLT</div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{iTotal}</div>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', marginTop: 2 }}>
                <span style={{ color: 'var(--ok)' }}>Berfungsi: {iGood}</span> · <span style={{ color: 'var(--bad)' }}>Rusak: {iBad}</span>
              </div>
            </div>
            <div className="kpi" style={{ borderLeft: '3px solid #3b82f6' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>Total IPAL</div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{aTotal}</div>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', marginTop: 2 }}>
                <span style={{ color: 'var(--ok)' }}>Berfungsi: {aGood}</span> · <span style={{ color: 'var(--bad)' }}>Rusak: {aBad}</span>
              </div>
            </div>
            <div className="kpi" style={{ borderLeft: '3px solid var(--bad)' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>Kab Belum Ada IPLT</div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{kabsNoIPLT.length}</div>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', marginTop: 2 }}>dari {kabsInProv.length} kab/kota</div>
            </div>
            <div className="kpi" style={{ borderLeft: '3px solid var(--ink-3)' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>Total Unit Rusak</div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{iBad + aBad}</div>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', marginTop: 2 }}>IPLT + IPAL gabungan</div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(kabsNoIPLT.length > 0 || brokenUnits.length > 0) && (
        <div className="page-pad" style={{ paddingBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {kabsNoIPLT.length > 0 && (
            <div className="card" style={{ background: 'rgba(239, 68, 68, 0.05)', borderLeft: '3px solid var(--bad)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--bad)', marginBottom: 8 }}>
                ⚠ Kab/Kota Belum Memiliki IPLT ({kabsNoIPLT.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 140, overflowY: 'auto' }} className="no-scrollbar">
                {kabsNoIPLT.map((k) => (
                  <span key={k.kode || k.kabkot} className="chip chip-bad" style={{ fontSize: 10 }}>{k.kabkot}</span>
                ))}
              </div>
            </div>
          )}
          {brokenUnits.length > 0 && (
            <div className="card" style={{ background: 'rgba(245, 158, 11, 0.05)', borderLeft: '3px solid var(--warn)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--warn)', marginBottom: 8 }}>
                ⚠ Daftar Unit Tidak Berfungsi ({brokenUnits.length})
              </div>
              <div style={{ display: 'grid', gap: 4, maxHeight: 180, overflowY: 'auto' }} className="no-scrollbar">
                {brokenUnits.map((u, i) => (
                  <div key={i} style={{ fontSize: 11, display: 'flex', gap: 8, alignItems: 'center', padding: '4px 6px', background: 'var(--paper)', borderRadius: 3 }}>
                    <span className="chip chip-accent" style={{ fontSize: 9 }}>{u.typ}</span>
                    <span style={{ fontWeight: 600 }}>{u.nama}</span>
                    <span style={{ color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', fontSize: 10, marginLeft: 'auto' }}>
                      {u.kabkot} · {u.tahunBangun || '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Geo chart */}
      <div className="page-pad" style={{ paddingBottom: 16 }}>
        <div className="card" style={{ borderTop: '4px solid #6366f1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Grafik Sebaran Capaian Kab/Kota · 2025</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, fontFamily: 'JetBrains Mono' }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#0d9488', marginRight: 4, borderRadius: 2 }} />Aman</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#8b5cf6', marginRight: 4, borderRadius: 2 }} />Layak (non-Aman)</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#ec4899', marginRight: 4, borderRadius: 2 }} />BABS</span>
            </div>
          </div>
          <div style={{ height: Math.max(280, kabsInProv.length * 22), position: 'relative' }}>
            <canvas ref={canvasGeo} />
          </div>
        </div>
      </div>

      {/* Tabular */}
      <div className="page-pad" style={{ paddingBottom: 32 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Data Tabular Kab/Kota · {selectedProv.provinsi}</span>
            <button className="btn btn-accent" style={{ fontSize: 11 }} onClick={() => onNavigate(`/kabkota?provinsi=${encodeURIComponent(selectedProv.provinsi)}`)}>
              Lihat profil kab/kota →
            </button>
          </div>
          <div style={{ maxHeight: 500, overflow: 'auto' }} className="no-scrollbar">
            <table className="data-table" style={{ minWidth: 480 }}>
              <thead>
                <tr>
                  {[['kabkot','Kabupaten/Kota'],['aman','Akses Aman'],['layak','Akses Layak'],['babs','BABS Terbuka']].map(([k, l]) => (
                    <th key={k} onClick={() => onSort(k)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      {l} {sortBy === k ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((k) => {
                  const babsHi = (k.babs2025 ?? 0) > 5;
                  return (
                    <tr key={k.kode || k.kabkot}>
                      <td style={{ fontWeight: 600, fontSize: 12 }}>{k.kabkot}</td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: statusColor(k.aman2025) }}>{fmtPct(k.aman2025)}</td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>{fmtPct(k.layak2025)}</td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: babsHi ? 'var(--bad)' : 'var(--ink-2)', fontWeight: babsHi ? 700 : 400 }}>
                        {fmtPct(k.babs2025)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

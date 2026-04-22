import { useProvinsi, useIPAL, useIPLT } from '../hooks/useSheetData';

const FEATURES = [
  {
    n: '01',
    t: 'Profil Provinsi',
    d: 'Capaian akses sanitasi layak dan aman, tren lima tahun, peringkat antar provinsi, serta gap terhadap target RPJMN.',
    meta: ['34 provinsi', '156 indikator', 'data: BPS'],
    path: '/provinsi',
    icon: 'P',
  },
  {
    n: '02',
    t: 'Data Infrastruktur',
    d: 'Peta titik IPAL, IPLT, TPA, dan fasilitas sanitasi lainnya. Dilengkapi catatan lapangan dan riwayat log per infrastruktur.',
    meta: ['infrastruktur', '6 jenis', 'log lapangan'],
    path: '/infrastruktur',
    icon: 'I',
  },
  {
    n: '03',
    t: 'Profil Kab/Kota',
    d: 'Tiga tab: akses, status infrastruktur, dan kelembagaan & regulasi. Termasuk pengelompokan cluster SSK per daerah.',
    meta: ['514 kab/kota', 'cluster SSK', 'baru'],
    path: '/kabkota',
    icon: 'K',
    isNew: true,
  },
];

export default function Landing({ onNavigate }) {
  const { data: provinsiData } = useProvinsi();
  const { data: ipalData } = useIPAL();
  const { data: ipltData } = useIPLT();

  const totalInfra = ipalData.length + ipltData.length;
  const totalProvinsi = provinsiData.length || 38;

  // Aggregate national stats from provinsi data
  const avgLayak = provinsiData.length
    ? (provinsiData.reduce((s, p) => s + (p.layak2024 ?? 0), 0) / provinsiData.length).toFixed(1)
    : null;
  const avgAman = provinsiData.length
    ? (provinsiData.reduce((s, p) => s + (p.aman2024 ?? 0), 0) / provinsiData.length).toFixed(1)
    : null;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{ padding: '56px 48px 32px', maxWidth: 900, margin: '0 auto' }}>
        <span className="chip chip-accent" style={{ marginBottom: 18, display: 'inline-flex' }}>
          Dashboard Sanitasi Nasional · 2025
        </span>
        <h1 style={{
          fontSize: 'clamp(32px, 5vw, 48px)', lineHeight: 1.1, letterSpacing: '-0.03em',
          fontWeight: 700, margin: '16px 0', color: 'var(--ink)',
        }}>
          Memantau akses sanitasi Indonesia.
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6, maxWidth: 560, margin: '0 0 28px' }}>
          Satu portal untuk profil provinsi, kab/kota, dan seluruh infrastruktur sanitasi—dengan catatan lapangan langsung dari tim monev daerah.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => onNavigate('/provinsi')}>
            Jelajahi Data →
          </button>
          <button className="btn btn-ghost" onClick={() => onNavigate('/infrastruktur')}>
            Lihat Infrastruktur
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        padding: '18px 48px', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)',
        display: 'flex', gap: 32, flexWrap: 'wrap', background: 'var(--paper)',
      }}>
        {[
          { label: 'Provinsi', value: totalProvinsi },
          { label: 'Kab/Kota', value: '514' },
          { label: 'Infrastruktur', value: totalInfra > 0 ? totalInfra.toLocaleString() : '—' },
          avgLayak && { label: 'Rata-rata Akses Layak', value: `${avgLayak}%` },
          avgAman && { label: 'Rata-rata Akses Aman', value: `${avgAman}%` },
        ].filter(Boolean).map((s, i) => (
          <div key={i}>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {s.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>{s.value}</div>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', alignSelf: 'center' }}>
          Sumber: BPS, KemenPUPR, Laporan Daerah
        </div>
      </div>

      {/* Feature cards */}
      <div style={{ padding: '40px 48px 64px' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 24 }}>
          ── Tiga Dashboard
        </div>

        {/* Desktop: 3-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {FEATURES.map((f, i) => (
            <button
              key={i}
              onClick={() => onNavigate(f.path)}
              style={{
                all: 'unset', cursor: 'pointer', display: 'block',
                border: `1.5px solid ${f.isNew ? 'var(--accent)' : 'var(--line)'}`,
                borderRadius: 'var(--radius)',
                background: f.isNew ? 'var(--accent-soft)' : 'var(--paper)',
                padding: 22,
                transition: 'box-shadow 0.15s, transform 0.15s',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{f.n}</span>
                <span style={{ fontSize: 18, color: 'var(--ink-3)' }}>→</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 8 }}>
                {f.t}
                {f.isNew && <span className="chip chip-accent" style={{ marginLeft: 10, fontSize: 9 }}>FITUR BARU</span>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 16 }}>{f.d}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {f.meta.map((m, j) => (
                  <span key={j} style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--ink-3)' }}>· {m}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div style={{
        padding: '20px 48px', borderTop: '1px solid var(--line)',
        display: 'flex', gap: 16, flexWrap: 'wrap',
        fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono',
        background: 'var(--paper)',
      }}>
        <span>Data diperbarui secara berkala dari Google Sheets</span>
        <span>·</span>
        <span>Terakhir dimuat: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>
    </div>
  );
}

import { useProvinsi, useKabkot, useIPAL, useIPLT, useLog } from '../hooks/useSheetData';
import { fmtNum, todayLabel } from '../lib/format';
import Icon from '../components/Icon';

const ENTRIES = [
  {
    icon: 'map',
    title: 'Provinsi',
    desc: 'Capaian akses layak, aman, dan BABS per provinsi; peta sebaran kab/kota; target 2026/2029; isu prioritas; ekspor CSV & PPTX.',
    path: '/provinsi',
    cta: 'Buka profil provinsi',
  },
  {
    icon: 'clipboard',
    title: 'Kabupaten/Kota',
    desc: 'Profil lengkap satu daerah: akses sanitasi, unit IPAL/IPLT, kelembagaan & regulasi, cluster tata kelola, dan catatan lapangan.',
    path: '/kabkota',
    cta: 'Buka profil kab/kota',
  },
  {
    icon: 'building',
    title: 'Infrastruktur',
    desc: 'Peta dan daftar seluruh unit IPAL/IPLT: status keberfungsian, kapasitas, utilisasi, serta pencatatan hasil monitoring lapangan.',
    path: '/infrastruktur',
    cta: 'Buka data infrastruktur',
  },
];

export default function Landing({ onNavigate }) {
  const { data: provinsiData } = useProvinsi();
  const { data: kabkotData } = useKabkot();
  const { data: ipalData } = useIPAL();
  const { data: ipltData } = useIPLT();
  const { data: logs } = useLog();

  const totalInfra = ipalData.length + ipltData.length;

  const stats = [
    { label: 'Provinsi', value: provinsiData.length || 38 },
    { label: 'Kabupaten/Kota', value: kabkotData.length || 514 },
    { label: 'Unit IPAL & IPLT', value: totalInfra > 0 ? fmtNum(totalInfra) : '—' },
    { label: 'Catatan Lapangan', value: logs.length > 0 ? fmtNum(logs.length) : '—' },
  ];

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Intro */}
      <div style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)' }}>
        <div className="page-wrap page-pad" style={{ paddingTop: 48, paddingBottom: 36 }}>
          <div className="section-label" style={{ marginBottom: 10 }}>Dashboard Sanitasi Nasional · Data 2025</div>
          <h1 className="title-mobile" style={{
            fontSize: 34, lineHeight: 1.15, letterSpacing: '-0.02em',
            fontWeight: 700, margin: '0 0 14px', maxWidth: 640,
          }}>
            Data kinerja sanitasi Indonesia untuk perencanaan dan monitoring.
          </h1>
          <p style={{ fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.65, maxWidth: 620, margin: '0 0 24px' }}>
            Dashboard ini menyajikan indikator akses sanitasi (layak, aman, BABS) dari BPS,
            data infrastruktur IPAL/IPLT, serta profil kelembagaan dan regulasi daerah —
            untuk 38 provinsi dan 514 kabupaten/kota. Data dapat diunduh sebagai CSV atau
            profil PPTX siap rapat, dan tim monev dapat menambahkan catatan lapangan per unit
            infrastruktur.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => onNavigate('/provinsi')}>
              Jelajahi data provinsi
              <Icon name="arrowRight" size={14} />
            </button>
            <button className="btn btn-ghost" onClick={() => onNavigate('/infrastruktur')}>
              Lihat infrastruktur
            </button>
          </div>
        </div>
      </div>

      {/* Stats band */}
      <div style={{ borderBottom: '1px solid var(--line)', background: 'var(--paper-2)' }}>
        <div className="page-wrap page-pad" style={{
          paddingTop: 16, paddingBottom: 16,
          display: 'flex', gap: '12px 40px', flexWrap: 'wrap', alignItems: 'center',
        }}>
          {stats.map((s) => (
            <div key={s.label}>
              <div className="num" style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{s.label}</div>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--ink-3)' }}>
            Sumber: BPS, Kementerian PUPR, laporan daerah · dimuat {todayLabel()}
          </div>
        </div>
      </div>

      {/* Entry points */}
      <div className="page-wrap page-pad" style={{ paddingTop: 32, paddingBottom: 56 }}>
        <div className="section-label" style={{ marginBottom: 16 }}>Tiga Tampilan Utama</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 16 }}>
          {ENTRIES.map((f) => (
            <button
              key={f.path}
              onClick={() => onNavigate(f.path)}
              style={{
                all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                border: '1px solid var(--line)', borderRadius: 'var(--radius)',
                background: 'var(--paper)', padding: 20,
                transition: 'border-color 0.15s ease-out, box-shadow 0.15s ease-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.boxShadow = 'var(--shadow-pop)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--line)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span style={{
                width: 34, height: 34, borderRadius: 8, marginBottom: 14,
                background: 'var(--accent-soft)', color: 'var(--accent)',
                display: 'grid', placeItems: 'center',
              }}>
                <Icon name={f.icon} size={17} />
              </span>
              <span style={{ fontSize: 16.5, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 7 }}>{f.title}</span>
              <span style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 14 }}>{f.desc}</span>
              <span style={{
                marginTop: 'auto', fontSize: 12.5, fontWeight: 600, color: 'var(--accent)',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
                {f.cta}
                <Icon name="arrowRight" size={13} />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
        <div className="page-wrap page-pad" style={{
          paddingTop: 16, paddingBottom: 16,
          display: 'flex', gap: '6px 16px', flexWrap: 'wrap',
          fontSize: 11.5, color: 'var(--ink-3)',
        }}>
          <span>Data dimuat langsung dari Google Sheets dan diperbarui berkala.</span>
          <span>Catatan lapangan tersimpan pada sheet “Log Catatan Infras”.</span>
        </div>
      </div>
    </div>
  );
}

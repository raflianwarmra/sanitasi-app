import { useProvinsi, useKabkot, useIPAL, useIPLT, useLog } from '../hooks/useSheetData';
import { fmtNum, todayLabel } from '../lib/format';
import Icon from '../components/Icon';

const ENTRIES = [
  {
    icon: 'map',
    title: 'Provinsi',
    desc: 'Capaian akses layak, aman, dan BABS; peta sebaran kab/kota; target 2026/2029; isu prioritas.',
    path: '/provinsi',
  },
  {
    icon: 'clipboard',
    title: 'Kabupaten/Kota',
    desc: 'Profil satu daerah: akses sanitasi, IPAL/IPLT, kelembagaan & regulasi, dan kondisi BUMD Air Minum.',
    path: '/kabkota',
  },
  {
    icon: 'building',
    title: 'Infrastruktur',
    desc: 'Peta dan daftar unit IPAL/IPLT: keberfungsian, kapasitas, utilisasi, dan catatan lapangan.',
    path: '/infrastruktur',
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
    { label: 'Kabupaten/kota', value: kabkotData.length || 514 },
    { label: 'Unit IPAL & IPLT', value: totalInfra > 0 ? fmtNum(totalInfra) : '—' },
    { label: 'Catatan lapangan', value: logs.length > 0 ? fmtNum(logs.length) : '—' },
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="page-wrap page-pad" style={{ paddingTop: 56, paddingBottom: 32 }}>
        <h1 className="text-largetitle title-mobile vt-title" style={{ margin: '0 0 14px', maxWidth: '20ch', textWrap: 'balance' }}>
          Data kinerja sanitasi Indonesia untuk perencanaan dan monitoring
        </h1>
        <p className="text-lead" style={{ maxWidth: '62ch', margin: '0 0 24px' }}>
          Indikator akses sanitasi (layak, aman, BABS) dari BPS, infrastruktur IPAL/IPLT,
          kelembagaan dan regulasi daerah, serta kinerja BUMD Air Minum untuk 38 provinsi
          dan 514 kabupaten/kota. Unduh CSV atau profil PPTX siap rapat, dan catat hasil
          monitoring lapangan per unit infrastruktur.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-accent" onClick={() => onNavigate('/provinsi')}>
            Jelajahi data provinsi
            <Icon name="arrowRight" size={14} />
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => onNavigate('/kabkota')}>
            Buka profil kab/kota
          </button>
        </div>

        <dl style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 40px', margin: '40px 0 0' }}>
          {stats.map((s) => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column-reverse' }}>
              <dt className="text-caption">{s.label}</dt>
              <dd className="num text-title2" style={{ margin: 0 }}>{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="page-wrap page-pad" style={{ paddingBottom: 56 }}>
        <h2 className="text-headline" style={{ margin: '0 0 10px' }}>Tampilan</h2>
        <nav aria-label="Tampilan dashboard" className="card" style={{ padding: 6 }}>
          {ENTRIES.map((f, i) => (
            <button
              key={f.path}
              type="button"
              className="list-row"
              onClick={() => onNavigate(f.path)}
              style={{
                padding: '14px 12px', gap: 14, alignItems: 'center', justifyContent: 'flex-start',
                borderTop: i ? '1px solid var(--line-2)' : 'none', borderRadius: i === 0 ? '10px 10px 0 0' : i === ENTRIES.length - 1 ? '0 0 10px 10px' : 0,
              }}
            >
              <span aria-hidden="true" style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: 'var(--accent-soft)', color: 'var(--accent-strong)',
                display: 'grid', placeItems: 'center',
              }}>
                <Icon name={f.icon} size={18} />
              </span>
              <span style={{ display: 'grid', gap: 2, minWidth: 0, flex: 1 }}>
                <span className="text-headline">{f.title}</span>
                <span className="text-caption" style={{ color: 'var(--ink-2)' }}>{f.desc}</span>
              </span>
              <Icon name="chevronRight" size={16} style={{ color: 'var(--ink-3)' }} />
            </button>
          ))}
        </nav>

        <p className="text-caption" style={{ margin: '14px 4px 0' }}>
          Sumber: BPS, Kementerian PUPR, Bappenas, laporan daerah · dimuat {todayLabel()}
        </p>
      </div>

      <footer style={{ borderTop: '1px solid var(--line-2)' }}>
        <div className="page-wrap page-pad text-caption" style={{
          paddingTop: 16, paddingBottom: 20, display: 'flex', gap: '6px 16px', flexWrap: 'wrap',
        }}>
          <span>Properti Tim Sanitasi Bappenas · Dibuat oleh Muh. Rafli Anwar — Perencana Ahli Pertama</span>
          <span>Data dimuat langsung dari Google Sheets dan diperbarui berkala.</span>
        </div>
      </footer>
    </div>
  );
}

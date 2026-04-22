import { useState, useMemo } from 'react';
import { useKabkot, useIPAL, useIPLT } from '../hooks/useSheetData';
import Breadcrumb from '../components/Breadcrumb';
import KpiCard from '../components/KpiCard';
import LoadingSpinner, { ErrorCard } from '../components/LoadingSpinner';

const CLUSTERS = [
  { id: 1, name: 'Cluster 1', desc: 'Risiko rendah · akses tinggi', color: 'var(--ok)' },
  { id: 2, name: 'Cluster 2', desc: 'Risiko sedang · akses cukup', color: 'var(--warn)' },
  { id: 3, name: 'Cluster 3', desc: 'Risiko tinggi · akses terbatas', color: 'oklch(60% 0.13 55)' },
  { id: 4, name: 'Cluster 4', desc: 'Risiko sangat tinggi', color: 'var(--bad)' },
];

function ClusterTag({ n }) {
  const n2 = parseInt(n, 10);
  return <span className={`cluster cluster-${isNaN(n2) || n2 < 1 || n2 > 4 ? 1 : n2}`}>{isNaN(n2) ? n : `Cluster ${n2}`}</span>;
}

function parseCluster(raw) {
  const s = String(raw ?? '').trim();
  const match = s.match(/\d/);
  return match ? parseInt(match[0], 10) : null;
}

// ── Tab: Akses ────────────────────────────────────────────────
function TabAkses({ kab }) {
  const yoyLayak = kab.layak2024 != null && kab.layak2023 != null
    ? `${(kab.layak2024 - kab.layak2023) > 0 ? '+' : ''}${(kab.layak2024 - kab.layak2023).toFixed(1)}pp`
    : null;

  return (
    <div style={{ display: 'grid', gap: 16, padding: '20px 24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <KpiCard label="Akses Layak" value={kab.layak2024?.toFixed(1)} delta={yoyLayak} />
        <KpiCard label="Akses Aman" value={kab.aman2024?.toFixed(1)} />
        <KpiCard label="BABS" value={kab.babs2024?.toFixed(1)} deltaGood={false} />
      </div>

      {/* Progress bars */}
      <div className="card">
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Komposisi Akses Sanitasi 2025</div>
        <div style={{ display: 'grid', gap: 12 }}>
          {[
            ['Akses Layak', kab.layak2024, 'var(--accent)'],
            ['Akses Aman', kab.aman2024, 'var(--ok)'],
            ['BABS', kab.babs2024, 'var(--bad)'],
          ].map(([label, value, color]) => (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                <span>{label}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{value != null ? `${value.toFixed(1)}%` : '—'}</span>
              </div>
              <div style={{ height: 8, background: 'var(--line-2)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(value ?? 0, 100)}%`, height: '100%', background: color, transition: 'width 0.5s' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {kab.raw && Object.keys(kab.raw).length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Data Lengkap</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {Object.entries(kab.raw).filter(([k, v]) => v && !['kabupaten_kota', 'kabkota', 'nama', 'provinsi'].includes(k)).slice(0, 12).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: '1px dashed var(--line-2)', paddingBottom: 4 }}>
                <span style={{ color: 'var(--ink-3)', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Infrastruktur ────────────────────────────────────────
function TabInfrastruktur({ kab, ipalData, ipltData }) {
  const kabLower = (kab.kabkot ?? '').toLowerCase();
  const infraHere = [...ipalData, ...ipltData].filter((i) =>
    i.kabkot?.toLowerCase().includes(kabLower) || kabLower.includes(i.kabkot?.toLowerCase() ?? '')
  );

  const byType = infraHere.reduce((acc, i) => {
    acc[i.type] = (acc[i.type] ?? []).concat(i);
    return acc;
  }, {});

  const total = infraHere.length;
  const functioning = infraHere.filter((i) => i.isFunctioning).length;

  return (
    <div style={{ padding: '20px 24px', display: 'grid', gap: 16 }}>
      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <KpiCard label="Total Infrastruktur" value={total} unit="" />
        <KpiCard label="Beroperasi" value={functioning} unit="" />
        <KpiCard label="Bermasalah" value={total - functioning} unit="" deltaGood={false} />
      </div>

      {/* By type */}
      {Object.entries(byType).map(([type, items]) => (
        <div key={type} className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line-2)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{type}</span>
            <span className="chip">{items.length} unit</span>
          </div>
          <table className="data-table">
            <thead><tr><th>Nama</th><th>Kapasitas</th><th>Tahun</th><th>Status</th></tr></thead>
            <tbody>
              {items.map((infra, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>{infra.nama || infra.id}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{infra.kapasitas ?? '—'}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{infra.tahunBangun || '—'}</td>
                  <td>
                    <span style={{ fontSize: 11, color: infra.isFunctioning ? 'var(--ok)' : 'var(--bad)', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                      ● {infra.isFunctioning ? 'Beroperasi' : 'Nonaktif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {infraHere.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic', padding: '20px 0' }}>
          Tidak ada data infrastruktur untuk {kab.kabkot}.
        </div>
      )}
    </div>
  );
}

// ── Tab: Kelembagaan & Regulasi ───────────────────────────────
function TabKelembagaan({ kab }) {
  const clusterNum = parseCluster(kab.cluster);
  const clusterInfo = CLUSTERS.find((c) => c.id === clusterNum);

  // Extract all raw fields for kelembagaan/regulasi
  const raw = kab.raw ?? {};
  const kelembagaanFields = Object.entries(raw).filter(([k]) =>
    ['pokja', 'sk', 'ketua', 'opd', 'anggaran', 'apbd', 'operator', 'personel', 'pelatihan', 'rapat', 'sdm'].some((s) => k.toLowerCase().includes(s))
  );
  const regulasiFields = Object.entries(raw).filter(([k]) =>
    ['perda', 'perbup', 'perwali', 'sk_bupati', 'ssk', 'mps', 'rpjmd', 'regulasi', 'peraturan'].some((s) => k.toLowerCase().includes(s))
  );

  return (
    <div style={{ padding: '20px 24px', display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        {/* Left: main kelembagaan */}
        <div style={{ display: 'grid', gap: 14 }}>
          {/* Cluster card */}
          {clusterNum && (
            <div className="card" style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent)' }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--accent)', marginBottom: 4 }}>KLASIFIKASI SSK</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Cluster {clusterNum}</div>
                <ClusterTag n={clusterNum} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>{clusterInfo?.desc ?? kab.cluster}</div>
            </div>
          )}

          {/* Kelembagaan data */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Kelembagaan Sanitasi</div>
              {kab.pokja && <span className="chip chip-ok">● Pokja aktif</span>}
            </div>
            {kelembagaanFields.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {kelembagaanFields.map(([k, v]) => (
                  <div key={k} style={{ padding: 10, background: 'var(--line-2)', borderRadius: 5, borderLeft: '3px solid var(--line)' }}>
                    <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>
                      {k.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{v || '—'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  ['Pokja Sanitasi', kab.pokja || 'Data belum tersedia'],
                  ['SK Pokja', kab.sk || '—'],
                  ['Operator', kab.operator || '—'],
                  ['Anggaran APBD', kab.anggaran || '—'],
                ].map(([l, v]) => (
                  <div key={l} style={{ padding: 10, background: 'var(--line-2)', borderRadius: 5, borderLeft: '3px solid var(--line)' }}>
                    <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{l}</div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Regulasi */}
          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Regulasi Daerah</div>
            {regulasiFields.length > 0 ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {regulasiFields.map(([k, v]) => (
                  <div key={k} style={{ padding: 10, borderLeft: `3px solid ${v && v !== '—' ? 'var(--ok)' : 'var(--warn)'}`, background: 'var(--line-2)', borderRadius: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 600 }}>{k.replace(/_/g, ' ').toUpperCase()}</span>
                      <span className={`chip ${v && v !== '—' ? 'chip-ok' : 'chip-warn'}`} style={{ fontSize: 9 }}>
                        {v && v !== '—' ? '● Ada' : '● Belum'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12 }}>{v || 'Belum tersedia'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {[
                  ['Perda', kab.perda, kab.perda],
                  ['Perbup/Perwali', kab.perbup, kab.perbup],
                  ['SSK', kab.ssk, kab.ssk],
                  ['MPS', kab.mps, kab.mps],
                ].map(([l, v, hasValue]) => (
                  <div key={l} style={{ padding: 10, borderLeft: `3px solid ${hasValue ? 'var(--ok)' : 'var(--warn)'}`, background: 'var(--line-2)', borderRadius: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 600 }}>{l}</span>
                      <span className={`chip ${hasValue ? 'chip-ok' : 'chip-warn'}`} style={{ fontSize: 9 }}>
                        {hasValue ? '● Ada' : '● Belum'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12 }}>{v || 'Data belum tersedia'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: summary panels */}
        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          {/* Akses ringkasan */}
          <div className="card">
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, fontFamily: 'JetBrains Mono' }}>Ringkasan Akses</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                ['LAYAK', kab.layak2024],
                ['AMAN', kab.aman2024],
                ['BABS', kab.babs2024],
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{l}</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{v != null ? `${v.toFixed(1)}%` : '—'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Cluster context */}
          <div className="card">
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, fontFamily: 'JetBrains Mono' }}>Cluster SSK Nasional</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {CLUSTERS.map((c) => (
                <div key={c.id} style={{
                  padding: 10, borderRadius: 5,
                  border: `1.5px solid ${c.id === clusterNum ? c.color : 'var(--line)'}`,
                  background: c.id === clusterNum ? 'var(--accent-soft)' : 'var(--paper)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <ClusterTag n={c.id} />
                    {c.id === clusterNum && <span className="chip chip-accent" style={{ fontSize: 9 }}>DAERAH INI</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 4 }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function KabKota({ onNavigate, initialProvinsi }) {
  const { data: kabkotData, loading, error, reload } = useKabkot();
  const { data: ipalData } = useIPAL();
  const { data: ipltData } = useIPLT();
  const [tab, setTab] = useState('Kelembagaan & Regulasi');
  const [searchKab, setSearchKab] = useState('');
  const [filterProv, setFilterProv] = useState(initialProvinsi ?? '');
  const [selected, setSelected] = useState(null);

  const provinsiList = useMemo(() => {
    const set = new Set(kabkotData.map((k) => k.provinsi).filter(Boolean));
    return ['', ...Array.from(set).sort()];
  }, [kabkotData]);

  const filtered = kabkotData.filter((k) => {
    if (filterProv && k.provinsi !== filterProv) return false;
    if (searchKab && !k.kabkot.toLowerCase().includes(searchKab.toLowerCase())) return false;
    return true;
  });

  const selectedKab = selected ?? filtered[0];

  if (loading) return <LoadingSpinner text="Memuat data kab/kota..." />;
  if (error) return <ErrorCard message={error} onRetry={reload} />;

  const TABS = ['Akses', 'Infrastruktur', 'Kelembagaan & Regulasi'];

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Breadcrumb
        path={[
          { label: 'Beranda', path: '/' },
          { label: 'Profil Kab/Kota', path: '/kabkota' },
          filterProv && { label: filterProv },
          selectedKab && { label: selectedKab.kabkot },
        ].filter(Boolean)}
        onNavigate={onNavigate}
      />

      {/* Header */}
      <div style={{ padding: '18px 24px', background: 'var(--paper)', borderBottom: '1.5px solid var(--line)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'end' }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', marginBottom: 4 }}>
              PROFIL KAB/KOTA · {filterProv || 'NASIONAL'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em' }}>
                {selectedKab?.kabkot ?? 'Pilih Kab/Kota'}
              </div>
              {selectedKab?.cluster && <ClusterTag n={parseCluster(selectedKab.cluster) ?? selectedKab.cluster} />}
            </div>
            {selectedKab && (
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>
                {selectedKab.provinsi}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select className="input" style={{ width: 160 }} value={filterProv} onChange={(e) => { setFilterProv(e.target.value); setSelected(null); }}>
              <option value="">Semua Provinsi</option>
              {provinsiList.filter(Boolean).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="input" style={{ width: 200 }} value={selectedKab?.kabkot ?? ''} onChange={(e) => setSelected(filtered.find((k) => k.kabkot === e.target.value) ?? null)}>
              <option value="">Pilih Kab/Kota</option>
              {filtered.map((k) => <option key={k.kabkot} value={k.kabkot}>{k.kabkot}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--paper)', borderBottom: '1.5px solid var(--line)', padding: '0 24px' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '12px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: 'none', background: 'transparent', fontFamily: 'inherit',
              color: tab === t ? 'var(--ink)' : 'var(--ink-3)',
              borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1.5, transition: 'color 0.15s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Cluster national context strip */}
      {tab === 'Kelembagaan & Regulasi' && (
        <div style={{ padding: '14px 24px', background: 'var(--paper)', borderBottom: '1px solid var(--line-2)' }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--ink-3)', marginBottom: 8 }}>
            Klasifikasi Cluster SSK · {kabkotData.length} Kab/Kota Nasional
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {CLUSTERS.map((c) => {
              const count = kabkotData.filter((k) => parseCluster(k.cluster) === c.id).length;
              const isSelected = parseCluster(selectedKab?.cluster) === c.id;
              return (
                <div key={c.id} className="card" style={{
                  padding: 12,
                  borderColor: isSelected ? 'var(--ink)' : 'var(--line)',
                  background: isSelected ? 'var(--accent-soft)' : 'var(--paper)',
                  borderWidth: isSelected ? 2 : 1.5,
                }}>
                  <ClusterTag n={c.id} />
                  <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{count}</div>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>kab/kota</div>
                  <div style={{ fontSize: 11, marginTop: 6, color: 'var(--ink-2)', lineHeight: 1.4 }}>{c.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab content */}
      {selectedKab ? (
        tab === 'Akses' ? <TabAkses kab={selectedKab} /> :
        tab === 'Infrastruktur' ? <TabInfrastruktur kab={selectedKab} ipalData={ipalData} ipltData={ipltData} /> :
        <TabKelembagaan kab={selectedKab} />
      ) : (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-3)' }}>
          <div style={{ marginBottom: 12 }}>Pilih kabupaten/kota dari dropdown di atas</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {filtered.slice(0, 8).map((k) => (
              <button key={k.kabkot} className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setSelected(k)}>
                {k.kabkot}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

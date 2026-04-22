import { useState, useMemo } from 'react';
import { useKabkot, useKelembagaan, useIPAL, useIPLT, useLog } from '../hooks/useSheetData';
import Breadcrumb from '../components/Breadcrumb';
import KpiCard from '../components/KpiCard';
import LoadingSpinner, { ErrorCard } from '../components/LoadingSpinner';
import LogCatatanList from '../components/LogCatatanList';
import SearchableSelect from '../components/SearchableSelect';
import { CLUSTER_LABELS, CLUSTER_COLORS, clusterLetter } from '../lib/cluster';

// ── Akses card ─────────────────────────────────────────────────
function AksesCard({ kab }) {
  return (
    <div className="card">
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Akses Sanitasi · 2025</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
        <KpiCard label="Akses Layak" value={kab.layak2025?.toFixed(2)} />
        <KpiCard label="Akses Aman" value={kab.aman2025?.toFixed(2)} />
        <KpiCard label="BABS (tempat terbuka)" value={kab.babs2025?.toFixed(2)} deltaGood={false} />
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {[
          ['Akses Layak', kab.layak2025, 'var(--accent)'],
          ['Akses Aman', kab.aman2025, 'var(--ok)'],
          ['BABS di tempat terbuka', kab.babs2025, 'var(--bad)'],
        ].map(([label, value, color]) => (
          <div key={label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
              <span>{label}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{value != null ? `${value.toFixed(2)}%` : '—'}</span>
            </div>
            <div style={{ height: 8, background: 'var(--line-2)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(value ?? 0, 100)}%`, height: '100%', background: color, transition: 'width 0.5s' }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', marginTop: 10 }}>Sumber: sheet "Akses Kabkot"</div>
    </div>
  );
}

// ── Infrastruktur card ─────────────────────────────────────────
function InfrastrukturCard({ kab, infraHere, logs }) {
  const total = infraHere.length;
  const functioning = infraHere.filter((i) => i.isFunctioning).length;
  const byType = infraHere.reduce((acc, i) => {
    acc[i.type] = (acc[i.type] ?? []).concat(i);
    return acc;
  }, {});

  return (
    <div className="card">
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Infrastruktur IPAL & IPLT</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
        <KpiCard label="Total" value={total} unit="" />
        <KpiCard label="Beroperasi" value={functioning} unit="" />
        <KpiCard label="Bermasalah" value={total - functioning} unit="" deltaGood={false} />
      </div>

      {Object.entries(byType).map(([type, items]) => (
        <div key={type} style={{ marginBottom: 12, border: '1px solid var(--line-2)', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--line-2)', display: 'flex', justifyContent: 'space-between', background: 'var(--line-2)' }}>
            <span style={{ fontWeight: 600, fontSize: 12 }}>{type}</span>
            <span className="chip" style={{ fontSize: 10 }}>{items.length} unit</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama</th><th>Kapasitas</th><th>Utilisasi</th><th>Tahun</th><th>Status</th><th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {items.map((infra, i) => {
                const util = infra.kapasitas && infra.kapasitasTerpakai ? (infra.kapasitasTerpakai / infra.kapasitas * 100) : null;
                const n = logs.filter((l) =>
                  l.infrastruktur && l.infrastruktur.toLowerCase() === infra.nama.toLowerCase()
                ).length;
                return (
                  <tr key={i}>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>{infra.nama}</td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{infra.kapasitas ?? '—'} m³/h</td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{util != null ? `${util.toFixed(1)}%` : '—'}</td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{infra.tahunBangun || '—'}</td>
                    <td>
                      <span style={{ fontSize: 11, color: infra.isFunctioning ? 'var(--ok)' : 'var(--bad)', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                        ● {infra.isFunctioning ? 'Beroperasi' : 'Nonaktif'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--ink-3)' }}>{n > 0 ? n : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {infraHere.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic', padding: '10px 0' }}>
          Tidak ada data infrastruktur untuk {kab.kabkot}.
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>Catatan Terbaru</div>
        <LogCatatanList
          logs={logs.filter((l) => (l.kabkot || '').toLowerCase() === (kab.kabkot || '').toLowerCase())}
          emptyText="Belum ada catatan infrastruktur untuk kab/kota ini."
        />
      </div>
    </div>
  );
}

// ── Kelembagaan card ───────────────────────────────────────────
function KelembagaanCard({ kel, kab }) {
  const regBadge = (v) => {
    const hasIt = v && String(v).trim() && !String(v).trim().match(/^x$/i);
    return hasIt
      ? <span className="chip chip-ok" style={{ fontSize: 10 }}>● Ada</span>
      : <span className="chip chip-warn" style={{ fontSize: 10 }}>● Belum</span>;
  };

  const letter = kel ? clusterLetter(kel.clusterTataKelola) : null;

  return (
    <div className="card">
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Kelembagaan & Regulasi</div>

      {!kel && (
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
          Data kelembagaan untuk {kab.kabkot} belum tersedia di sheet "Kelembagaan Regulasi".
        </div>
      )}

      {kel && (
        <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Operator</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[['Status Operator', kel.statusOperator], ['Nama Operator', kel.namaOperator]].map(([l, v]) => (
                  <div key={l} style={{ padding: 10, background: 'var(--line-2)', borderRadius: 5, borderLeft: '3px solid var(--line)' }}>
                    <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{l}</div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{v || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Regulasi Daerah</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {[
                  ['Regulasi Pengelolaan ALD', kel.regulasiPengelolaan, kel.perdaPengelolaan],
                  ['Regulasi Retribusi / Tarif', kel.regulasiRetribusi, kel.perdaRetribusi],
                ].map(([l, flag, nama]) => (
                  <div key={l} style={{ padding: 10, borderLeft: `3px solid ${flag && !String(flag).match(/^x$/i) ? 'var(--ok)' : 'var(--warn)'}`, background: 'var(--line-2)', borderRadius: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 600 }}>{l}</span>
                      {regBadge(flag)}
                    </div>
                    <div style={{ fontSize: 12 }}>{nama || (flag && !String(flag).match(/^x$/i) ? 'Ada, nama belum dicatat' : 'Belum tersedia')}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cluster side panel */}
          <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
            <div style={{ padding: 14, borderRadius: 6, background: letter ? 'var(--accent-soft)' : 'var(--line-2)', borderLeft: `4px solid ${letter ? (CLUSTER_COLORS[letter] ?? 'var(--accent)') : 'var(--line)'}` }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>CLUSTER TATA KELOLA</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
                <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, color: letter ? (CLUSTER_COLORS[letter] ?? 'var(--accent)') : 'var(--ink-3)' }}>
                  {letter ?? '—'}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  {letter ? CLUSTER_LABELS[letter] : 'Tidak teridentifikasi'}
                </div>
              </div>
              {kel.clusterTataKelola && letter && kel.clusterTataKelola.trim().toUpperCase() !== letter && (
                <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', marginTop: 6 }}>
                  Nilai sheet: "{kel.clusterTataKelola}"
                </div>
              )}
            </div>

            <div style={{ padding: 12, borderRadius: 6, background: 'var(--paper)', border: '1px solid var(--line-2)' }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em', marginBottom: 8 }}>KETERANGAN CLUSTER</div>
              <div style={{ display: 'grid', gap: 4 }}>
                {Object.entries(CLUSTER_LABELS).map(([L, txt]) => (
                  <div key={L} style={{ display: 'flex', gap: 8, fontSize: 11, alignItems: 'start', opacity: letter && letter !== L ? 0.6 : 1 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 3, background: CLUSTER_COLORS[L], color: 'white', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'JetBrains Mono' }}>{L}</div>
                    <div style={{ fontWeight: letter === L ? 700 : 400 }}>{txt}{L === 'F' ? ' ✅' : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function KabKota({ onNavigate, initialProvinsi }) {
  const { data: kabkotData, loading, error, reload } = useKabkot();
  const { data: kelembagaanData } = useKelembagaan();
  const { data: ipalData } = useIPAL();
  const { data: ipltData } = useIPLT();
  const { data: logs } = useLog();
  const [filterProv, setFilterProv] = useState(initialProvinsi ?? '');
  const [selected, setSelected] = useState(null);

  const provinsiList = useMemo(() => {
    const set = new Set(kabkotData.map((k) => k.provinsi).filter(Boolean));
    return Array.from(set).sort();
  }, [kabkotData]);

  const filtered = kabkotData.filter((k) => !filterProv || k.provinsi === filterProv);
  const selectedKab = selected ?? filtered[0];

  const kel = useMemo(() => {
    if (!selectedKab) return null;
    return kelembagaanData.find((x) => String(x.kode) === String(selectedKab.kode))
      || kelembagaanData.find((x) => x.kabkot?.toLowerCase() === selectedKab.kabkot?.toLowerCase())
      || null;
  }, [selectedKab, kelembagaanData]);

  const infraHere = useMemo(() => {
    if (!selectedKab) return [];
    return [...ipalData, ...ipltData].filter((i) =>
      (i.kode && String(i.kode) === String(selectedKab.kode)) ||
      (i.kabkot && selectedKab.kabkot && i.kabkot.toLowerCase().includes(selectedKab.kabkot.toLowerCase()))
    );
  }, [selectedKab, ipalData, ipltData]);

  if (loading) return <LoadingSpinner text="Memuat data kab/kota..." />;
  if (error) return <ErrorCard message={error} onRetry={reload} />;

  const letter = kel ? clusterLetter(kel.clusterTataKelola) : null;

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

      <div className="page-pad" style={{ paddingTop: 18, paddingBottom: 18, background: 'var(--paper)', borderBottom: '1.5px solid var(--line)' }}>
        <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'end' }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.08em', marginBottom: 4 }}>
              PROFIL KAB/KOTA · {filterProv || 'NASIONAL'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em' }}>
                {selectedKab?.kabkot ?? 'Pilih Kab/Kota'}
              </div>
              {letter && (
                <span className="chip" style={{ background: CLUSTER_COLORS[letter], color: 'white', fontWeight: 700 }}>
                  Cluster {letter} — {CLUSTER_LABELS[letter]}
                </span>
              )}
            </div>
            {selectedKab && (
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2, fontFamily: 'JetBrains Mono' }}>
                {selectedKab.provinsi} · Kode {selectedKab.kode}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <SearchableSelect
              style={{ width: 180 }}
              value={filterProv}
              onChange={(v) => { setFilterProv(v); setSelected(null); }}
              options={[{ value: '', label: 'Semua Provinsi' }, ...provinsiList.map((p) => ({ value: p, label: p }))]}
              placeholder="Semua Provinsi"
            />
            <SearchableSelect
              style={{ width: 220 }}
              value={selectedKab?.kode ?? ''}
              onChange={(v) => setSelected(filtered.find((k) => k.kode === v) ?? null)}
              options={filtered.map((k) => ({ value: k.kode, label: k.kabkot }))}
              placeholder="Pilih Kab/Kota"
            />
          </div>
        </div>
      </div>

      {selectedKab ? (
        <div className="page-pad" style={{ paddingTop: 20, paddingBottom: 20, display: 'grid', gap: 16 }}>
          <AksesCard kab={selectedKab} />
          <InfrastrukturCard kab={selectedKab} infraHere={infraHere} logs={logs} />
          <KelembagaanCard kel={kel} kab={selectedKab} />
        </div>
      ) : (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-3)' }}>
          Pilih kabupaten/kota dari dropdown di atas.
        </div>
      )}
    </div>
  );
}

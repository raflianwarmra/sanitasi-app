import { useState, useMemo } from 'react';
import Chart from 'chart.js/auto';
import { useKabkot, useKelembagaan, useIPAL, useIPLT, useLog } from '../hooks/useSheetData';
import { useTheme, cssVar } from '../lib/theme';
import { fmtPct, csvNum, slugify } from '../lib/format';
import { downloadCsvSections } from '../lib/exportCsv';
import { exportKabkotaPptx } from '../lib/exportPptx';
import Breadcrumb from '../components/Breadcrumb';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import MetricCard from '../components/MetricCard';
import ChartContainer, { ChartLegend } from '../components/ChartContainer';
import ExportButtons from '../components/ExportButtons';
import EmptyState from '../components/EmptyState';
import LoadingSpinner, { ErrorCard } from '../components/LoadingSpinner';
import LogCatatanList from '../components/LogCatatanList';
import SearchableSelect from '../components/SearchableSelect';
import { CLUSTER_LABELS, CLUSTER_COLORS, clusterLetter } from '../lib/cluster';
import { islandOf } from '../lib/islandTheme';

const hasVal = (v) => v && String(v).trim() && !/^x$/i.test(String(v).trim());

// ── Akses card ─────────────────────────────────────────────────
function AksesCard({ kab, theme }) {
  const aman = kab.aman2025 ?? 0;
  const layakNon = Math.max(0, (kab.layak2025 ?? 0) - aman);
  const babs = kab.babs2025 ?? 0;
  const sisa = Math.max(0, 100 - (kab.layak2025 ?? 0) - babs);

  return (
    <SectionCard title="Akses Sanitasi · 2025" subtitle='Sumber: sheet "Akses Kabkot" (BPS)'>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        <MetricCard label="Akses Layak" value={kab.layak2025 != null ? fmtPct(kab.layak2025) : null} tone="layak" />
        <MetricCard label="Akses Aman" value={kab.aman2025 != null ? fmtPct(kab.aman2025) : null} tone="aman" />
        <MetricCard label="BABS Terbuka" value={kab.babs2025 != null ? fmtPct(kab.babs2025) : null} tone={babs > 10 ? 'bad' : 'babs'} />
      </div>
      <ChartContainer
        height={56}
        ariaLabel={`Komposisi akses sanitasi ${kab.kabkot} 2025`}
        deps={[kab.kode, theme]}
        build={(canvas) => new Chart(canvas, {
          type: 'bar',
          data: {
            labels: ['2025'],
            datasets: [
              { label: 'Akses Aman', data: [aman], backgroundColor: cssVar('--viz-aman') },
              { label: 'Layak (non-Aman)', data: [layakNon], backgroundColor: cssVar('--viz-layak') },
              { label: 'Dasar / Belum Layak', data: [sisa], backgroundColor: cssVar('--viz-muted') },
              { label: 'BABS Terbuka', data: [babs], backgroundColor: cssVar('--viz-babs') },
            ],
          },
          options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            scales: { x: { stacked: true, display: false, max: 100 }, y: { stacked: true, display: false } },
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtPct(Number(ctx.raw))}` } },
            },
          },
        })}
      />
      <ChartLegend
        style={{ marginTop: 10 }}
        items={[
          { color: 'var(--viz-aman)', label: 'Aman', value: fmtPct(aman) },
          { color: 'var(--viz-layak)', label: 'Layak (non-Aman)', value: fmtPct(layakNon) },
          { color: 'var(--viz-muted)', label: 'Dasar / Belum Layak', value: fmtPct(sisa) },
          { color: 'var(--viz-babs)', label: 'BABS', value: fmtPct(babs) },
        ]}
      />
    </SectionCard>
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
  const kabLogs = logs.filter((l) => (l.kabkot || '').toLowerCase() === (kab.kabkot || '').toLowerCase());

  return (
    <SectionCard title="Infrastruktur IPAL & IPLT" subtitle={total ? `${total} unit tercatat` : undefined}>
      {total > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 16 }}>
          <MetricCard label="Total Unit" value={total} unit="" />
          <MetricCard label="Beroperasi" value={functioning} unit="" tone="ok" />
          <MetricCard label="Bermasalah" value={total - functioning} unit="" tone={total - functioning > 0 ? 'bad' : 'ok'} />
        </div>
      )}

      {Object.entries(byType).map(([type, items]) => (
        <div key={type} style={{ marginBottom: 14, border: '1px solid var(--line-2)', borderRadius: 7, overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--line-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper-2)' }}>
            <span style={{ fontWeight: 600, fontSize: 12.5 }}>{type === 'IPAL' ? 'IPAL — Air Limbah Domestik' : 'IPLT — Lumpur Tinja'}</span>
            <span className="chip" style={{ fontSize: 10.5 }}>{items.length} unit</span>
          </div>
          <div className="table-scroll">
            <table className="data-table" style={{ minWidth: 620 }}>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th className="td-num">Kapasitas (m³/hari)</th>
                  <th className="td-num">Utilisasi</th>
                  <th>Tahun</th>
                  <th>Status</th>
                  <th className="td-num">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {items.map((infra, i) => {
                  const util = infra.kapasitas && infra.kapasitasTerpakai ? (infra.kapasitasTerpakai / infra.kapasitas) * 100 : null;
                  const n = logs.filter((l) => l.infrastruktur && l.infrastruktur.toLowerCase() === infra.nama.toLowerCase()).length;
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{infra.nama}</td>
                      <td className="td-num">{infra.kapasitas ?? '—'}</td>
                      <td className="td-num">{util != null ? fmtPct(util, 1) : '—'}</td>
                      <td>{infra.tahunBangun || '—'}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: infra.isFunctioning ? 'var(--ok)' : 'var(--bad)' }}>
                          <span className="dot" style={{ background: infra.isFunctioning ? 'var(--ok)' : 'var(--bad)' }} />
                          {infra.isFunctioning ? 'Beroperasi' : 'Tidak berfungsi'}
                        </span>
                      </td>
                      <td className="td-num" style={{ color: 'var(--ink-3)' }}>{n > 0 ? n : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {total === 0 && (
        <EmptyState
          compact icon="building"
          title={`Belum ada data IPAL/IPLT untuk ${kab.kabkot}`}
          text="Data akan muncul otomatis setelah unit tercatat pada sheet IPAL/IPLT."
        />
      )}

      <div style={{ marginTop: 4 }}>
        <div className="section-label" style={{ marginBottom: 8 }}>Catatan Terbaru</div>
        <LogCatatanList
          logs={kabLogs}
          emptyText="Belum ada catatan infrastruktur untuk kab/kota ini."
        />
      </div>
    </SectionCard>
  );
}

// ── Kelembagaan card ───────────────────────────────────────────
function KelembagaanCard({ kel, kab }) {
  const letter = kel ? clusterLetter(kel.clusterTataKelola) : null;

  const regBadge = (v) => (hasVal(v)
    ? <span className="chip chip-ok" style={{ fontSize: 10.5 }}>Ada</span>
    : <span className="chip chip-warn" style={{ fontSize: 10.5 }}>Belum</span>);

  return (
    <SectionCard title="Kelembagaan & Regulasi" subtitle='Sumber: sheet "Kelembagaan Regulasi"'>
      {!kel && (
        <EmptyState
          compact icon="clipboard"
          title={`Data kelembagaan ${kab.kabkot} belum tersedia`}
          text='Lengkapi sheet "Kelembagaan Regulasi" untuk menampilkan profil operator, perda, dan cluster tata kelola.'
        />
      )}

      {kel && (
        <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
          <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>Operator</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
                {[['Status Operator', kel.statusOperator], ['Nama Operator', kel.namaOperator]].map(([l, v]) => (
                  <div key={l} style={{ padding: 11, background: 'var(--paper-2)', borderRadius: 7, border: '1px solid var(--line-2)' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 500, marginBottom: 3 }}>{l}</div>
                    <div style={{ fontWeight: 600, fontSize: 12.5 }}>{v || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>Regulasi Daerah</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {[
                  ['Regulasi Pengelolaan ALD', kel.regulasiPengelolaan, kel.perdaPengelolaan],
                  ['Regulasi Retribusi / Tarif', kel.regulasiRetribusi, kel.perdaRetribusi],
                ].map(([l, flag, nama]) => (
                  <div key={l} style={{ padding: 11, background: 'var(--paper-2)', borderRadius: 7, border: '1px solid var(--line-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{l}</span>
                      {regBadge(flag)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                      {nama || (hasVal(flag) ? 'Ada, nama perda belum dicatat' : 'Belum tersedia')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cluster side panel */}
          <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
            <div style={{ padding: 14, borderRadius: 7, border: '1px solid var(--line-2)', background: letter ? 'var(--paper-2)' : 'var(--paper)' }}>
              <div className="section-label">Cluster Tata Kelola</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
                <div className="num" style={{ fontSize: 38, fontWeight: 700, lineHeight: 1, color: letter ? (CLUSTER_COLORS[letter] ?? 'var(--accent)') : 'var(--ink-3)' }}>
                  {letter ?? '—'}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                  {letter ? CLUSTER_LABELS[letter] : 'Tidak teridentifikasi'}
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8, lineHeight: 1.5 }}>
                Pengelompokan kesiapan tata kelola sanitasi daerah, dari A (perlu intervensi menyeluruh) hingga F (tata kelola lengkap).
              </div>
              {kel.clusterTataKelola && letter && kel.clusterTataKelola.trim().toUpperCase() !== letter && (
                <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 6 }}>
                  Nilai pada sheet: “{kel.clusterTataKelola}”
                </div>
              )}
            </div>

            <div style={{ padding: 12, borderRadius: 7, border: '1px solid var(--line-2)' }}>
              <div className="section-label" style={{ marginBottom: 8 }}>Keterangan Cluster</div>
              <div style={{ display: 'grid', gap: 5 }}>
                {Object.entries(CLUSTER_LABELS).map(([L, txt]) => (
                  <div key={L} style={{ display: 'flex', gap: 8, fontSize: 11.5, alignItems: 'flex-start', opacity: letter && letter !== L ? 0.55 : 1 }}>
                    <span className="num" style={{
                      width: 18, height: 18, borderRadius: 4, background: CLUSTER_COLORS[L],
                      color: 'white', fontWeight: 700, fontSize: 11,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>{L}</span>
                    <span style={{ fontWeight: letter === L ? 600 : 400, lineHeight: 1.45 }}>{txt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function KabKota({ onNavigate, initialProvinsi, initialKode }) {
  const { data: kabkotData, loading, error, reload } = useKabkot();
  const { data: kelembagaanData } = useKelembagaan();
  const { data: ipalData } = useIPAL();
  const { data: ipltData } = useIPLT();
  const { data: logs } = useLog();
  const { theme } = useTheme();
  const [filterProv, setFilterProv] = useState(initialProvinsi ?? '');
  const [selected, setSelected] = useState(null);

  const provinsiList = useMemo(() => {
    const set = new Set(kabkotData.map((k) => k.provinsi).filter(Boolean));
    return Array.from(set).sort();
  }, [kabkotData]);

  const filtered = useMemo(
    () => kabkotData.filter((k) => !filterProv || k.provinsi === filterProv),
    [kabkotData, filterProv],
  );
  const fromUrl = useMemo(
    () => (initialKode ? kabkotData.find((k) => String(k.kode) === String(initialKode)) : null),
    [kabkotData, initialKode],
  );
  const selectedKab = selected ?? fromUrl ?? filtered[0];

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
      (i.kabkot && selectedKab.kabkot && i.kabkot.toLowerCase().includes(selectedKab.kabkot.toLowerCase())));
  }, [selectedKab, ipalData, ipltData]);

  const kabLogs = useMemo(() => {
    if (!selectedKab) return [];
    return logs
      .filter((l) => (l.kabkot || '').toLowerCase() === (selectedKab.kabkot || '').toLowerCase())
      .sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)));
  }, [logs, selectedKab]);

  const letter = kel ? clusterLetter(kel.clusterTataKelola) : null;
  const island = selectedKab ? islandOf(selectedKab.kode) : null;
  const clusterInfo = letter ? `${letter} — ${CLUSTER_LABELS[letter]}` : null;

  // ── Exports ──
  const handleCsv = () => {
    if (!selectedKab) return;
    downloadCsvSections(`sanitasi-kabkota-${slugify(selectedKab.kabkot)}`, [
      {
        title: `Profil ${selectedKab.kabkot} · ${selectedKab.provinsi}`,
        columns: [
          { key: 'kode', label: 'Kode BPS' },
          { key: 'kabkot', label: 'Kabupaten/Kota' },
          { key: 'provinsi', label: 'Provinsi' },
          { key: 'aman', label: 'Akses Aman 2025 (%)' },
          { key: 'layak', label: 'Akses Layak 2025 (%)' },
          { key: 'babs', label: 'BABS Terbuka 2025 (%)' },
          { key: 'cluster', label: 'Cluster Tata Kelola' },
        ],
        rows: [{
          kode: selectedKab.kode, kabkot: selectedKab.kabkot, provinsi: selectedKab.provinsi,
          aman: csvNum(selectedKab.aman2025), layak: csvNum(selectedKab.layak2025), babs: csvNum(selectedKab.babs2025),
          cluster: clusterInfo || '',
        }],
      },
      {
        title: 'Infrastruktur IPAL & IPLT',
        columns: [
          { key: 'type', label: 'Jenis' },
          { key: 'nama', label: 'Nama Unit' },
          { key: 'kapasitas', label: 'Kapasitas Desain (m³/hari)' },
          { key: 'terpakai', label: 'Kapasitas Terpakai (m³/hari)' },
          { key: 'tahun', label: 'Tahun Pembangunan' },
          { key: 'status', label: 'Status Keberfungsian' },
        ],
        rows: infraHere.map((u) => ({
          type: u.type, nama: u.nama,
          kapasitas: u.kapasitas ?? '', terpakai: u.kapasitasTerpakai ?? '',
          tahun: u.tahunBangun || '', status: u.statusText || (u.isFunctioning ? 'Berfungsi' : 'Tidak berfungsi'),
        })),
      },
      kel && {
        title: 'Kelembagaan & Regulasi',
        columns: [{ key: 'aspek', label: 'Aspek' }, { key: 'nilai', label: 'Status' }],
        rows: [
          { aspek: 'Status Operator', nilai: kel.statusOperator || '' },
          { aspek: 'Nama Operator', nilai: kel.namaOperator || '' },
          { aspek: 'Regulasi Pengelolaan ALD', nilai: hasVal(kel.regulasiPengelolaan) ? (kel.perdaPengelolaan || 'Ada') : 'Belum ada' },
          { aspek: 'Regulasi Retribusi / Tarif', nilai: hasVal(kel.regulasiRetribusi) ? (kel.perdaRetribusi || 'Ada') : 'Belum ada' },
          { aspek: 'Cluster Tata Kelola', nilai: clusterInfo || kel.clusterTataKelola || '' },
        ],
      },
      {
        title: 'Catatan Lapangan',
        columns: [
          { key: 'tanggal', label: 'Tanggal' },
          { key: 'infrastruktur', label: 'Infrastruktur' },
          { key: 'sumber', label: 'Sumber' },
          { key: 'user', label: 'Petugas' },
          { key: 'catatan', label: 'Catatan' },
        ],
        rows: kabLogs.map((l) => ({
          tanggal: l.tanggal || '', infrastruktur: l.infrastruktur || '',
          sumber: l.sumber || '', user: l.user || '', catatan: l.catatan || '',
        })),
      },
    ].filter(Boolean));
  };

  const handlePptx = () => exportKabkotaPptx(selectedKab, kel, clusterInfo, infraHere, kabLogs);

  if (loading) return <LoadingSpinner text="Memuat data kab/kota…" />;
  if (error) return <ErrorCard message={error} onRetry={reload} />;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Breadcrumb
        path={[
          { label: 'Beranda', path: '/' },
          { label: 'Kabupaten/Kota', path: '/kabkota' },
          filterProv && { label: filterProv },
          selectedKab && { label: selectedKab.kabkot },
        ].filter(Boolean)}
        onNavigate={onNavigate}
      />

      <PageHeader
        island={island}
        kicker={`Profil Kabupaten/Kota · ${selectedKab?.provinsi ?? 'Nasional'}${island ? ` · ${island.name}` : ''}`}
        title={selectedKab?.kabkot ?? 'Pilih Kab/Kota'}
        titleExtra={letter && (
          <span className="chip" style={{ background: CLUSTER_COLORS[letter], borderColor: 'transparent', color: 'white', fontWeight: 600 }}>
            Cluster {letter} — {CLUSTER_LABELS[letter]}
          </span>
        )}
        meta={selectedKab ? <>Kode BPS <span className="mono">{selectedKab.kode}</span> · {infraHere.length} unit infrastruktur · {kabLogs.length} catatan</> : undefined}
        controls={(
          <>
            <SearchableSelect
              style={{ width: 190 }}
              value={filterProv}
              onChange={(v) => { setFilterProv(v); setSelected(null); }}
              options={[{ value: '', label: 'Semua Provinsi' }, ...provinsiList.map((p) => ({ value: p, label: p }))]}
              placeholder="Semua Provinsi"
            />
            <SearchableSelect
              style={{ width: 210 }}
              value={selectedKab?.kode ?? ''}
              onChange={(v) => setSelected(filtered.find((k) => k.kode === v) ?? null)}
              options={filtered.map((k) => ({ value: k.kode, label: k.kabkot }))}
              placeholder="Pilih Kab/Kota"
            />
            {selectedKab && <ExportButtons onCsv={handleCsv} onPptx={handlePptx} />}
          </>
        )}
      />

      {selectedKab ? (
        <div className="page-wrap page-pad" style={{ paddingTop: 16, paddingBottom: 40, display: 'grid', gap: 16 }}>
          <AksesCard kab={selectedKab} theme={theme} />
          <InfrastrukturCard kab={selectedKab} infraHere={infraHere} logs={logs} />
          <KelembagaanCard kel={kel} kab={selectedKab} />
        </div>
      ) : (
        <EmptyState
          icon="search"
          title="Pilih kabupaten/kota"
          text="Gunakan dropdown provinsi dan kab/kota di atas untuk membuka profil."
        />
      )}
    </div>
  );
}

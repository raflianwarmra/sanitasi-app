import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePresence, useFocusTrap, useDragDismiss, useZoomFromOrigin, rowLinkProps } from '../hooks/useOverlay';
import { withViewTransition } from '../lib/viewTransition';
import { useKabkot, useKelembagaan, useIPAL, useIPLT, useLog, useLadderKabkot, useNasional, useBumd, useAnggaran, useAnggaranAld } from '../hooks/useSheetData';
import { useTheme } from '../lib/theme';
import { fmtPct, csvNum, slugify } from '../lib/format';
import { downloadCsvSections } from '../lib/exportCsv';
import { exportKabkotaPptx } from '../lib/exportPptx';
import Breadcrumb from '../components/Breadcrumb';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import MetricCard from '../components/MetricCard';
import LadderChart from '../components/LadderChart';
import InfraDetailPanel from '../components/InfraDetailPanel';
import BenchmarkChart from '../components/BenchmarkChart';
import ExportButtons from '../components/ExportButtons';
import EmptyState from '../components/EmptyState';
import LoadingSpinner, { ErrorCard } from '../components/LoadingSpinner';
import LogCatatanList from '../components/LogCatatanList';
import SearchableSelect from '../components/SearchableSelect';
import BumdCard from '../components/BumdCard';
import AnggaranCard from '../components/AnggaranCard';
import { findBumd } from '../lib/bumd';
import { CLUSTER_LABELS, CLUSTER_COLORS, clusterLetter, rawClusterLetter } from '../lib/cluster';
import { islandOf, islandPageProps } from '../lib/islandTheme';
import { loadPref, savePref } from '../lib/persist';

const hasVal = (v) => v && String(v).trim() && !/^x$/i.test(String(v).trim());
const KAB_PROV_KEY = 'sanitasi_kab_prov';
const KAB_KODE_KEY = 'sanitasi_kab_kode';

// Benchmark selector options (mirrors the Provinsi map metric selector).
const BENCH_METRICS = [
  { key: 'layak2025', label: 'Akses Layak', title: 'Akses Layak (termasuk Aman)', colorVar: '--viz-layak', natKey: 'layak', higherBetter: true },
  { key: 'aman2025', label: 'Akses Aman', title: 'Akses Aman', colorVar: '--viz-aman', natKey: 'aman', higherBetter: true },
  { key: 'babs2025', label: 'BABS Terbuka', title: 'BABS di Tempat Terbuka', colorVar: '--viz-babs', natKey: 'babs', higherBetter: false },
];

// ── Akses card ─────────────────────────────────────────────────
function AksesCard({ kab, theme, ladderRungs }) {
  const babs = kab.babs2025 ?? 0;
  return (
    <SectionCard title="Akses Sanitasi · 2025" subtitle='Sumber: sheet "Akses Kabkot" & "Ladder Kabupaten/Kota" (BPS)'>
      <div className="metric-grid" style={{ marginBottom: 18 }}>
        <MetricCard label="Akses Layak" value={kab.layak2025 != null ? fmtPct(kab.layak2025) : null} tone="layak" />
        <MetricCard label="Akses Aman" value={kab.aman2025 != null ? fmtPct(kab.aman2025) : null} tone="aman" />
        <MetricCard label="BABS Terbuka" value={kab.babs2025 != null ? fmtPct(kab.babs2025) : null} tone={babs > 10 ? 'bad' : 'babs'} />
      </div>
      <div className="section-label" style={{ marginBottom: 8 }}>Tangga Sanitasi</div>
      <LadderChart rungs={ladderRungs} idKey={kab.kode} theme={theme} />
    </SectionCard>
  );
}

// ── Infrastruktur card ─────────────────────────────────────────
function InfrastrukturCard({ kab, infraHere, logs, onOpenInfra }) {
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
        <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', marginBottom: 16 }}>
          <MetricCard label="Total Unit" value={total} unit="" />
          <MetricCard label="Beroperasi" value={functioning} unit="" tone="ok" />
          <MetricCard label="Bermasalah" value={total - functioning} unit="" tone={total - functioning > 0 ? 'bad' : 'ok'} />
        </div>
      )}

      {Object.entries(byType).map(([type, items]) => (
        <div key={type} style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="section-label">{type === 'IPAL' ? 'IPAL — Air Limbah Domestik' : 'IPLT — Lumpur Tinja'}</span>
            <span className="chip">{items.length} unit</span>
          </div>
          <div className="table-scroll" style={{ margin: '0 -14px' }}>
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
                    <tr key={i} {...rowLinkProps((e) => onOpenInfra(infra, e))}>
                      <td style={{ fontWeight: 600, color: 'var(--accent-strong)' }}>{infra.nama}</td>
                      <td className="td-num">{infra.kapasitas ?? '—'}</td>
                      <td className="td-num">{util != null ? fmtPct(util, 1) : '—'}</td>
                      <td>{infra.tahunBangun || '—'}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600, color: infra.isFunctioning ? 'var(--ok)' : 'var(--bad)' }}>
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

// Tinted badge: cluster color as text on a soft wash of itself — legible in
// both themes (white-on-color failed contrast in dark mode).
function ClusterBadge({ letter, size }) {
  const c = CLUSTER_COLORS[letter];
  return (
    <span className="num" aria-hidden="true" style={{
      width: size, height: size, borderRadius: 6, flexShrink: 0,
      background: `color-mix(in oklch, ${c} 16%, var(--paper))`, color: c,
      fontWeight: 700, fontSize: '0.75rem',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>{letter}</span>
  );
}

// ── Kelembagaan card ───────────────────────────────────────────
function KelembagaanCard({ kel, kab }) {
  const letter = kel ? clusterLetter(kel.clusterTataKelola) : null;
  const rawLetter = kel ? rawClusterLetter(kel.clusterTataKelola) : null;

  const regBadge = (v) => (hasVal(v)
    ? <span className="chip chip-ok">Ada</span>
    : <span className="chip chip-warn">Belum</span>);

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
              <div className="metric-grid" style={{ gap: 8 }}>
                {[['Status Operator', kel.statusOperator], ['Nama Operator', kel.namaOperator]].map(([l, v]) => (
                  <div key={l} className="inset inset-sm">
                    <div className="kpi-label">{l}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{v || '—'}</div>
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
                  <div key={l} className="inset inset-sm">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{l}</span>
                      {regBadge(flag)}
                    </div>
                    <div className="text-caption" style={{ color: 'var(--ink-2)' }}>
                      {nama || (hasVal(flag) ? 'Ada, nama perda belum dicatat' : 'Belum tersedia')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cluster side panel */}
          <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
            <div className="inset">
              <div className="section-label">Cluster Tata Kelola</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
                <div className="num" style={{ fontSize: '2.375rem', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em', color: letter ? (CLUSTER_COLORS[letter] ?? 'var(--accent)') : 'var(--ink-3)' }}>
                  {letter ?? '—'}
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                  {letter ? CLUSTER_LABELS[letter] : 'Tidak teridentifikasi'}
                </div>
              </div>
              <div className="text-caption" style={{ marginTop: 8 }}>
                Pengelompokan kesiapan tata kelola sanitasi daerah, dari A (tata kelola lengkap) hingga F (perlu intervensi menyeluruh).
              </div>
              {kel.clusterTataKelola && rawLetter && kel.clusterTataKelola.trim().toUpperCase() !== rawLetter && (
                <div className="text-caption2" style={{ marginTop: 6 }}>
                  Nilai pada sheet: “{kel.clusterTataKelola}”
                </div>
              )}
            </div>

            <div style={{ padding: '4px 2px' }}>
              <div className="section-label" style={{ marginBottom: 8 }}>Keterangan Cluster</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {Object.entries(CLUSTER_LABELS).map(([L, txt]) => (
                  <div key={L} style={{ display: 'flex', gap: 8, fontSize: '0.78125rem', alignItems: 'flex-start', color: letter && letter !== L ? 'var(--ink-3)' : 'var(--ink)' }}>
                    <ClusterBadge letter={L} size={20} />
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
  const { data: logs, reload: reloadLogs } = useLog();
  const { data: ladderKab } = useLadderKabkot();
  const { data: nasional } = useNasional();
  const { data: bumdRows, loading: bumdLoading } = useBumd();
  const { data: anggaranRows, loading: anggaranLoading } = useAnggaran();
  const { data: aldRows, loading: aldLoading } = useAnggaranAld();
  const { theme } = useTheme();
  // Priority: URL deep-link (map click) -> persisted -> none.
  const [filterProv, setFilterProv] = useState(initialProvinsi || loadPref(KAB_PROV_KEY) || '');
  const [selected, setSelected] = useState(null);
  // A new deep-link (?kode=, incl. browser back/forward) overrides an earlier
  // in-page pick, otherwise the stale pick would win.
  const [linkedKode, setLinkedKode] = useState(initialKode);
  if (initialKode !== linkedKode) { setLinkedKode(initialKode); setSelected(null); }
  const [infraDetail, setInfraDetail] = useState(null);
  const [benchMetric, setBenchMetric] = useState('aman2025');

  // Infra detail dialog: keep the last unit rendered while it animates out.
  const [shownDetail, setShownDetail] = useState(null);
  if (infraDetail && infraDetail !== shownDetail) setShownDetail(infraDetail);
  const detailPresence = usePresence(!!infraDetail, 460);
  const dialogRef = useRef(null);
  const grabberRef = useRef(null);
  const scrimRef = useRef(null);
  const [origin, setOrigin] = useState(null);
  const openInfra = (infra, e) => {
    setOrigin(e?.currentTarget?.getBoundingClientRect?.() ?? null);
    setInfraDetail(infra);
  };
  useFocusTrap(dialogRef, !!infraDetail, () => setInfraDetail(null));
  // desktop: zoom out of / back into the row; phone: drag the sheet down
  useZoomFromOrigin(dialogRef, detailPresence.mounted ? detailPresence.state : null, origin);
  useDragDismiss(dialogRef, { axis: 'y', enabled: detailPresence.mounted, handleRef: grabberRef, scrimRef, onDismiss: () => setInfraDetail(null) });


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
  // Persisted kab/kota — only when there's no URL deep-link, and only if the
  // saved kode still belongs to the (also persisted) province filter.
  const persistedKab = useMemo(() => {
    if (initialKode) return null;
    const saved = loadPref(KAB_KODE_KEY);
    return saved ? filtered.find((k) => String(k.kode) === String(saved)) ?? null : null;
  }, [initialKode, filtered]);
  // Priority: explicit pick -> URL deep-link -> persisted -> first in list.
  const selectedKab = selected ?? fromUrl ?? persistedKab ?? filtered[0];

  // Remember province filter + selected kab/kota across navigation/restart.
  useEffect(() => { savePref(KAB_PROV_KEY, filterProv); }, [filterProv]);
  const selKode = selectedKab?.kode;
  useEffect(() => { if (selKode) savePref(KAB_KODE_KEY, selKode); }, [selKode]);

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

  const bumd = useMemo(
    () => (selectedKab ? findBumd(bumdRows, selectedKab.kode) : null),
    [bumdRows, selectedKab],
  );

  const kabLadder = useMemo(
    () => (selectedKab ? (ladderKab.find((r) => String(r.kode) === String(selectedKab.kode))?.rungs ?? null) : null),
    [ladderKab, selectedKab],
  );

  // Peers = all kab/kota sharing the province kode prefix (benchmark base).
  const peers = useMemo(
    () => (selectedKab ? kabkotData.filter((k) => String(k.kode).slice(0, 2) === String(selectedKab.kode).slice(0, 2)) : []),
    [kabkotData, selectedKab],
  );

  const letter = kel ? clusterLetter(kel.clusterTataKelola) : null;
  const island = selectedKab ? islandOf(selectedKab.kode) : null;

  useEffect(() => {
    if (island) document.documentElement.setAttribute('data-island', island.id);
    else document.documentElement.removeAttribute('data-island');
    return () => document.documentElement.removeAttribute('data-island');
  }, [island]);
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
      bumd && {
        title: `BUMD Air Minum · Tahun Buku ${bumd.tahunBuku || ''}`.trim(),
        columns: [{ key: 'aspek', label: 'Aspek' }, { key: 'nilai', label: 'Nilai' }],
        rows: [
          { aspek: 'Nama BUMD', nilai: bumd.nama },
          { aspek: 'Lingkup', nilai: bumd.lingkup },
          { aspek: 'Status Kinerja', nilai: bumd.status || '' },
          { aspek: 'Nilai Kinerja (0-5)', nilai: csvNum(bumd.nilai, 3) },
          { aspek: 'FCR/Non FCR', nilai: bumd.fcr == null ? '' : bumd.fcr ? 'FCR' : 'Non FCR' },
          { aspek: 'Tarif Rata-rata (Rp/m3)', nilai: csvNum(bumd.tarif, 0) },
          { aspek: 'HPP (Rp/m3)', nilai: csvNum(bumd.hpp, 0) },
          { aspek: 'Pelanggan Aktif (SR)', nilai: csvNum(bumd.pelangganAktif, 0) },
          { aspek: 'Pelanggan Total (SR)', nilai: csvNum(bumd.pelangganTotal, 0) },
          { aspek: 'Cakupan Pelayanan Teknis (%)', nilai: csvNum(bumd.cakupan) },
          { aspek: 'Pendapatan Operasi (Rp)', nilai: csvNum(bumd.pendapatan, 0) },
          { aspek: 'Biaya Operasi (Rp)', nilai: csvNum(bumd.biaya, 0) },
          { aspek: 'Laba Bersih Setelah Pajak (Rp)', nilai: csvNum(bumd.laba, 0) },
          { aspek: 'Tagihan Rekening Air (Rp)', nilai: csvNum(bumd.tagihan, 0) },
          { aspek: 'Penerimaan Rekening Air (Rp)', nilai: csvNum(bumd.penerimaan, 0) },
        ],
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

  const handlePptx = () => exportKabkotaPptx(selectedKab, kel, clusterInfo, infraHere, kabLogs, bumd);

  if (loading) return <LoadingSpinner text="Memuat data kab/kota…" />;
  if (error) return <ErrorCard message={error} onRetry={reload} />;

  return (
    <div {...islandPageProps(island)}>
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
        context={selectedKab ? selectedKab.provinsi : 'Profil kabupaten/kota'}
        title={selectedKab?.kabkot ?? 'Pilih Kab/Kota'}
        titleExtra={letter && (
          <span className="chip" style={{ background: `color-mix(in oklch, ${CLUSTER_COLORS[letter]} 16%, var(--paper))`, color: CLUSTER_COLORS[letter], fontWeight: 600 }}>
            Cluster {letter} — {CLUSTER_LABELS[letter]}
          </span>
        )}
        meta={selectedKab ? [
          <>Kode BPS <span className="mono">{selectedKab.kode}</span></>,
          `${infraHere.length} unit infrastruktur`,
          `${kabLogs.length} catatan`,
        ] : undefined}
        controls={(
          <>
            <SearchableSelect
              style={{ width: 200, maxWidth: '100%' }}
              value={filterProv}
              onChange={(v) => withViewTransition(() => { setFilterProv(v); setSelected(null); })}
              options={[{ value: '', label: 'Semua Provinsi' }, ...provinsiList.map((p) => ({ value: p, label: p }))]}
              placeholder="Semua Provinsi"
              ariaLabel="Provinsi"
            />
            <SearchableSelect
              style={{ width: 220, maxWidth: '100%' }}
              value={selectedKab?.kode ?? ''}
              onChange={(v) => withViewTransition(() => setSelected(filtered.find((k) => k.kode === v) ?? null))}
              options={filtered.map((k) => ({ value: k.kode, label: k.kabkot }))}
              placeholder="Pilih Kab/Kota"
              ariaLabel="Kabupaten/kota"
            />
            {selectedKab && <ExportButtons onCsv={handleCsv} onPptx={handlePptx} />}
          </>
        )}
      >
        {selectedKab && <AksesCard kab={selectedKab} theme={theme} ladderRungs={kabLadder} />}
      </PageHeader>

      {selectedKab ? (
        <div className="page-wrap page-pad stack" style={{ paddingTop: 8, paddingBottom: 48 }}>
          <SectionCard
            title="Posisi di Provinsi"
            subtitle={`Perbandingan ${peers.length} kab/kota di ${selectedKab.provinsi} · garis putus-putus: rata-rata provinsi & nasional`}
            actions={(
              <div className="seg" role="group" aria-label="Pilih indikator perbandingan">
                {BENCH_METRICS.map((m) => (
                  <button key={m.key} type="button" aria-pressed={benchMetric === m.key} onClick={() => setBenchMetric(m.key)}>
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          >
            {(() => {
              const m = BENCH_METRICS.find((x) => x.key === benchMetric);
              return (
                <BenchmarkChart
                  title={m.title}
                  metricKey={m.key}
                  colorVar={m.colorVar}
                  rows={peers}
                  selectedKode={selectedKab.kode}
                  natValue={nasional?.[m.natKey]?.y2025}
                  theme={theme}
                  higherBetter={m.higherBetter}
                />
              );
            })()}
          </SectionCard>
          <InfrastrukturCard kab={selectedKab} infraHere={infraHere} logs={logs} onOpenInfra={openInfra} />
          <AnggaranCard
            kode={selectedKab.kode} nama={selectedKab.kabkot}
            rows={anggaranRows} aldRows={aldRows} loading={anggaranLoading || aldLoading}
            infra={infraHere}
          />
          <KelembagaanCard kel={kel} kab={selectedKab} />
          <BumdCard kab={selectedKab} bumd={bumd} loading={bumdLoading} rowCount={bumdRows.length} />
        </div>
      ) : (
        <EmptyState
          icon="search"
          title="Pilih kabupaten/kota"
          text="Gunakan dropdown provinsi dan kab/kota di atas untuk membuka profil."
        />
      )}

      {detailPresence.mounted && shownDetail && createPortal(
        <>
          <div ref={scrimRef} className="scrim" data-state={detailPresence.state} onClick={() => setInfraDetail(null)} aria-hidden="true" />
          <div className="dialog-wrap">
            <div
              ref={dialogRef}
              role="dialog" aria-modal="true" aria-label={`Detail ${shownDetail.nama}`}
              className="dialog"
              data-state={detailPresence.state}
              data-zoom={origin ? 'true' : undefined}
              data-scroll
            >
              <div ref={grabberRef} className="sheet-grabber" aria-hidden="true"><span /></div>
              <InfraDetailPanel
                infra={shownDetail}
                logs={logs}
                onClose={() => setInfraDetail(null)}
                reloadLogs={reloadLogs}
              />
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

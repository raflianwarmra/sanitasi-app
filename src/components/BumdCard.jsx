// Kondisi BUMD Air Minum for one kab/kota: performance status (Sehat /
// Kurang Sehat / Sakit), cost recovery (FCR), customers & service coverage,
// and operating revenue & net profit. Source: sheet "BUMD Air Minum".

import { fmtNum, fmtPct, fmtRp } from '../lib/format';
import { BUMD_THRESHOLDS } from '../lib/bumd';
import SectionCard from './SectionCard';
import MetricCard from './MetricCard';
import EmptyState from './EmptyState';
import { SkeletonPanel } from './LoadingSpinner';

const STATUS_TONE = { Sehat: 'ok', 'Kurang Sehat': 'warn', Sakit: 'bad' };

function ScoreScale({ nilai, status }) {
  const { sakit, sehat, max } = BUMD_THRESHOLDS;
  const at = (v) => `${(Math.min(Math.max(v, 0), max) / max) * 100}%`;
  const tone = STATUS_TONE[status] ?? 'default';
  return (
    <div>
      <div className="score-scale" role="img" aria-label={`Nilai kinerja ${fmtNum(nilai, 2)} dari ${max}; batas Kurang Sehat ${sakit}, batas Sehat ${sehat}`}>
        <span className="score-zone" style={{ left: 0, width: at(sakit), background: 'var(--bad-soft)' }} />
        <span className="score-zone" style={{ left: at(sakit), width: `calc(${at(sehat)} - ${at(sakit)})`, background: 'var(--warn-soft)' }} />
        <span className="score-zone" style={{ left: at(sehat), right: 0, background: 'var(--ok-soft)' }} />
        {nilai != null && <span className="score-marker" style={{ left: at(nilai), background: `var(--${tone})` }} />}
      </div>
      <div className="score-ticks" aria-hidden="true">
        <span style={{ left: 0 }}>0</span>
        <span style={{ left: at(sakit) }}>2,2</span>
        <span style={{ left: at(sehat) }}>2,8</span>
        <span style={{ left: '100%' }}>5</span>
      </div>
    </div>
  );
}

function Pill({ tone, label, value }) {
  return (
    <div className="pill-stat">
      <span className="pill-stat-label">{label}</span>
      <span className={`chip chip-${tone}`} style={{ fontWeight: 600 }}>
        <span className="dot" style={{ background: 'currentColor' }} aria-hidden="true" />
        {value}
      </span>
    </div>
  );
}

export default function BumdCard({ kab, bumd, loading, rowCount }) {
  const subtitle = bumd
    ? `Tahun Buku ${bumd.tahunBuku || '—'} · sumber: sheet "BUMD Air Minum" (Data Kinerja BUMD AM, Bappenas)`
    : 'Sumber: sheet "BUMD Air Minum" (Data Kinerja BUMD AM, Bappenas)';

  return (
    <SectionCard title="Kondisi BUMD Air Minum" subtitle={subtitle}>
      {loading && <SkeletonPanel rows={2} height={72} />}

      {!loading && !rowCount && (
        <EmptyState
          compact icon="droplet"
          title="Data kinerja BUMD Air Minum belum termuat"
          text='Tambahkan tab "BUMD Air Minum" pada Google Sheet sumber agar kondisi BUMD tampil di sini.'
        />
      )}

      {!loading && rowCount > 0 && !bumd && (
        <EmptyState
          compact icon="droplet"
          title={`Tidak ada BUMD Air Minum tercatat untuk ${kab.kabkot}`}
          text={`Data kinerja mencakup ${fmtNum(rowCount)} BUMD; daerah ini belum dinilai atau dilayani oleh BUMD di luar wilayahnya.`}
        />
      )}

      {!loading && bumd && (() => {
        const margin = bumd.pendapatan ? (bumd.laba / bumd.pendapatan) * 100 : null;
        const selisih = bumd.tarif != null && bumd.hpp != null ? bumd.tarif - bumd.hpp : null;
        return (
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="bumd-head">
              <div style={{ minWidth: 0 }}>
                <div className="bumd-name">{bumd.nama}</div>
                {bumd.lingkup === 'Provinsi' && (
                  <div className="text-caption" style={{ marginTop: 2 }}>
                    BUMD tingkat provinsi: angka di bawah mencakup seluruh {bumd.provinsi}.
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Pill label="Status kinerja" tone={STATUS_TONE[bumd.status] ?? 'accent'} value={`${bumd.status ?? '—'} · ${fmtNum(bumd.nilai, 2)}`} />
                <Pill label="Pemulihan biaya" tone={bumd.fcr ? 'ok' : 'warn'} value={bumd.fcr == null ? '—' : bumd.fcr ? 'FCR' : 'Non FCR'} />
              </div>
            </div>

            <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
              <div className="inset">
                <div className="section-label" style={{ marginBottom: 10 }}>Nilai kinerja (0–5)</div>
                <ScoreScale nilai={bumd.nilai} status={bumd.status} />
              </div>
              <div className="inset">
                <div className="section-label" style={{ marginBottom: 8 }}>Tarif vs biaya per m³</div>
                <div className="text-body">
                  Tarif rata-rata <strong className="num">Rp{fmtNum(bumd.tarif)}</strong> · HPP <strong className="num">Rp{fmtNum(bumd.hpp)}</strong>
                </div>
                <div className="text-caption" style={{ marginTop: 4, color: selisih != null && selisih < 0 ? 'var(--warn)' : undefined }}>
                  {selisih == null ? '—' : selisih >= 0
                    ? `Tarif menutup biaya (lebih Rp${fmtNum(selisih)}/m³)`
                    : `Tarif di bawah biaya (kurang Rp${fmtNum(-selisih)}/m³)`}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
              <MetricCard
                label="Pelanggan aktif"
                value={bumd.pelangganAktif != null ? fmtNum(bumd.pelangganAktif) : null}
                unit="SR"
                sub={bumd.pelangganTotal != null ? `dari ${fmtNum(bumd.pelangganTotal)} SR terdaftar` : undefined}
              />
              <MetricCard
                label="Cakupan pelayanan teknis"
                value={bumd.cakupan != null ? fmtPct(bumd.cakupan, 1) : null}
                tone="accent"
                sub={bumd.pendudukTerlayani != null ? `${fmtNum(bumd.pendudukTerlayani)} dari ${fmtNum(bumd.pendudukWilayah)} jiwa di wilayah pelayanan` : undefined}
                meter={bumd.cakupan}
              />
              <MetricCard
                label="Pendapatan operasi"
                value={fmtRp(bumd.pendapatan)}
                sub={bumd.biaya != null ? `Biaya operasi ${fmtRp(bumd.biaya)}` : undefined}
              />
              <MetricCard
                label="Laba bersih setelah pajak"
                value={fmtRp(bumd.laba)}
                tone={bumd.laba == null ? 'default' : bumd.laba >= 0 ? 'ok' : 'bad'}
                sub={margin != null ? `Margin ${fmtPct(margin, 1)} dari pendapatan operasi` : undefined}
              />
            </div>

            <div className="text-caption" style={{ lineHeight: 1.55 }}>
              {bumd.tagihan != null && (
                <>
                  Rekening air ditagihkan {fmtRp(bumd.tagihan)}, diterima {fmtRp(bumd.penerimaan)}
                  {bumd.efektivitasTagih != null && <> (efektivitas penagihan {fmtPct(bumd.efektivitasTagih, 1)})</>}.{' '}
                </>
              )}
              Cakupan dihitung terhadap penduduk di wilayah pelayanan BUMD, bukan seluruh penduduk kab/kota,
              sehingga tidak sebanding langsung dengan indikator akses sanitasi.
            </div>
          </div>
        );
      })()}
    </SectionCard>
  );
}

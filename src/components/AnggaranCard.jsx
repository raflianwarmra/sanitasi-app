// Anggaran PU daerah (APBD 2026, SIPD) for one Pemprov or kab/kota, in two
// tabs: Ringkasan (ALD against the other PU sectors, rank) and Rincian ALD
// (sub-kegiatan detail; on a province also every kab/kota, expandable).
// Glance-first: figures and bars carry the message, captions stay to one
// short line. Sources: sheets "Anggaran PU" and "Anggaran ALD Rinci".

import { useMemo, useState } from 'react';
import { fmtNum, fmtPct, fmtRp } from '../lib/format';
import {
  SECTORS, DANA, BELANJA, AGREGAT_NOTE,
  provinceBudget, sumAnggaran, aldRank, groupAld, sumSplit, share, isProvKode,
} from '../lib/anggaran';
import SectionCard from './SectionCard';
import MetricCard from './MetricCard';
import EmptyState from './EmptyState';
import { SkeletonPanel } from './LoadingSpinner';
import { RpBarList } from './RpBars';

const ALD = 'var(--viz-ald)';
const ALD_LIGHT = 'var(--viz-ald-light)';
const OTHER = 'var(--viz-muted)';
const OTHER_STRONG = 'var(--viz-neutral)';
const SUBTITLE = 'APBD 2026 (SIPD) · tahap murni/perubahan tidak tercantum';

// Shares under 1% keep two decimals so a small ALD never reads as "0,0%".
const fmtShare = (v) => fmtPct(v, v != null && v < 1 ? 2 : 1);

// "Modal 70% · Barang & jasa 30%" for the parts that round to at least 1%.
function splitText(split, defs, total) {
  return defs.filter((d) => share(split[d.key], total) >= 0.5)
    .sort((a, b) => split[b.key] - split[a.key])
    .map((d) => `${d.label} ${fmtPct(share(split[d.key], total), 0)}`)
    .join(' · ');
}

// Funding-source names as planners say them: "PENDAPATAN ASLI DAERAH (PAD)"
// -> "PAD", "DAK Fisik-Bidang Sanitasi-Reguler" -> "DAK Sanitasi-Reguler".
const DANA_SHORT = [
  [/^penarikan sisa lebih perhitungan anggaran blud$/i, 'SiLPA BLUD'],
  [/^sisa lebih perhitungan anggaran/i, 'SiLPA'],
  [/^DAK Fisik-Bidang /, 'DAK '],
];
function shortDana(text) {
  return String(text || '').split(/;\s*/).filter(Boolean).map((n) => {
    const acr = n.match(/\(([A-Z]{2,6})\)\s*$/);
    if (acr) return acr[1];
    const rule = DANA_SHORT.find(([re]) => re.test(n));
    return rule ? n.replace(rule[0], rule[1]) : n;
  }).join(' · ');
}

// ALD sub-kegiatan of one pemda, grouped by kelompok, amounts right-aligned.
export function AldRincian({ items }) {
  const groups = groupAld(items);
  return (
    <div>
      <div className="ald-cols text-caption2" aria-hidden="true">
        <span>Sub-kegiatan</span><span>Target (RKPD)</span><span>Sumber dana</span><span>Nilai</span>
      </div>
      {groups.map((g) => (
        <div key={g.kelompok} className="ald-group">
          <div className="ald-group-head">
            <span className="section-label">{g.kelompok}</span>
            <span className="num text-caption" style={{ color: 'var(--ink)', fontWeight: 600 }}>{fmtRp(g.total)}</span>
          </div>
          <ul className="ald-list">
            {g.items.map((it) => (
              <li key={it.kodeSub} className="ald-item">
                <div className="ald-main">
                  <div className="ald-name">{it.subKegiatan}</div>
                  <div className="text-caption">{it.skpd}</div>
                </div>
                <div className="ald-out text-caption">
                  <span className="ald-k">Target: </span>
                  {it.target ? <strong className="num" style={{ color: 'var(--ink)' }}>{it.target}</strong> : '—'}
                  {it.indikator && <div className="ald-ind" title={it.indikator}>{it.indikator}</div>}
                </div>
                <div className="ald-dana text-caption" title={it.sumberDana}>
                  <span className="ald-k">Dana: </span>{shortDana(it.sumberDana) || '—'}
                </div>
                <div className="ald-value num">{fmtRp(it.nilai)}</div>
                <div className="ald-split text-caption2">{splitText(it.belanja, BELANJA, it.nilai)}</div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Note({ children }) {
  return <div className="text-caption">{children}</div>;
}

function SectorBars({ sektor, ariaLabel }) {
  const rows = SECTORS.map((s) => ({
    key: s.key, label: s.label, selected: s.key === 'ald',
    segments: [{ key: 'v', value: sektor[s.key], color: s.key === 'ald' ? ALD : OTHER }],
  })).sort((a, b) => b.segments[0].value - a.segments[0].value);
  return <RpBarList rows={rows} ariaLabel={ariaLabel} />;
}

const rankProps = (r) => (r
  ? { value: fmtNum(r.rank), unit: `dari ${r.of}` }
  : { value: null, sub: 'Tidak ada anggaran ALD' });

// ── Kab/Kota ────────────────────────────────────────────────────
function KabRingkasan({ row, rows }) {
  const provRows = rows.filter((r) => !isProvKode(r.kode) && r.kode.startsWith(row.kode.slice(0, 2)));
  const rProv = aldRank(provRows, row.kode);
  const rNat = aldRank(rows.filter((r) => !isProvKode(r.kode)), row.kode);
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <MetricCard label="Air Limbah Domestik" tone="ald" value={fmtRp(row.sektor.ald)}
          sub={`${fmtShare(share(row.sektor.ald, row.totalSektor))} dari sektor PU`} />
        <MetricCard label="Peringkat ALD di provinsi" {...rankProps(rProv)} />
        <MetricCard label="Peringkat ALD nasional" {...rankProps(rNat)} />
        <MetricCard label="Total sektor PU" value={fmtRp(row.totalSektor)} sub={`Di luar Penunjang ${fmtRp(row.penunjang)}`} />
      </div>
      <div>
        <div className="section-label" style={{ marginBottom: 8 }}>Per sektor</div>
        <SectorBars sektor={row.sektor} ariaLabel={`Anggaran per sektor PU ${row.nama}, urut terbesar`} />
      </div>
    </div>
  );
}

function KabRincian({ row, items, infra }) {
  if (!items.length) {
    return <EmptyState compact icon="droplet" title={`${row.nama} tidak menganggarkan ALD pada APBD 2026`} />;
  }
  const total = row.sektor.ald;
  const dana = sumSplit(items, 'dana', DANA);
  const belanja = sumSplit(items, 'belanja', BELANJA);
  const om = items.filter((x) => x.kelompok === 'Operasi & Pemeliharaan').reduce((s, x) => s + x.nilai, 0);
  const count = (type) => infra.filter((i) => i.type === type).length;
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <MetricCard label="Total ALD" tone="ald" value={fmtRp(total)} sub={`${items.length} sub-kegiatan`} />
        <MetricCard label="Porsi DAK" value={fmtPct(share(dana.dak, total), 0)} sub={splitText(dana, DANA, total)} />
        <MetricCard label="Belanja modal" value={fmtPct(share(belanja.modal, total), 0)} />
      </div>
      {infra.length > 0 && (
        <div className="inset inset-sm text-body">
          Tercatat <strong className="num">{count('IPAL')}</strong> IPAL · <strong className="num">{count('IPLT')}</strong> IPLT
          {' · '}O&M 2026 <strong className="num">{fmtRp(om)}</strong>
          {om === 0 && <span style={{ color: 'var(--warn)' }}> · belum dianggarkan</span>}
        </div>
      )}
      <AldRincian items={items} />
    </div>
  );
}

// ── Provinsi ────────────────────────────────────────────────────
function ProvRingkasan({ provKode, rows, kabCount }) {
  const { pemprov, kabs, agregat } = provinceBudget(rows, provKode);
  const kabsWithAld = kabs.filter((k) => k.sektor.ald > 0).length;

  const provRank = useMemo(() => {
    const codes = [...new Set(rows.map((r) => r.kode.slice(0, 2)))];
    const totals = codes.map((c) => ({ kode: c, ald: provinceBudget(rows, c).agregat.sektor.ald }))
      .filter((p) => p.ald > 0).sort((a, b) => b.ald - a.ald);
    const i = totals.findIndex((p) => p.kode === provKode);
    return i < 0 ? null : { rank: i + 1, of: totals.length };
  }, [rows, provKode]);

  const pp = pemprov?.sektor ?? Object.fromEntries(SECTORS.map((s) => [s.key, 0]));
  const sectorRows = SECTORS.map((s) => ({
    key: s.key, label: s.label, selected: s.key === 'ald',
    segments: [
      { key: 'prov', value: pp[s.key], color: s.key === 'ald' ? ALD : OTHER_STRONG },
      { key: 'kab', value: agregat.sektor[s.key] - pp[s.key], color: s.key === 'ald' ? ALD_LIGHT : OTHER },
    ],
  })).sort((a, b) => agregat.sektor[b.key] - agregat.sektor[a.key]);

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <MetricCard label="ALD Pemprov" tone="ald" value={pemprov ? fmtRp(pp.ald) : null}
          sub={!pemprov ? 'APBD Pemprov tidak tersedia' : pp.ald > 0 ? `${fmtShare(share(pp.ald, pemprov.totalSektor))} dari sektor PU Pemprov` : 'Tidak dianggarkan'} />
        <MetricCard label="ALD Pemprov + kab/kota" tone="ald" value={fmtRp(agregat.sektor.ald)}
          sub={`${fmtShare(share(agregat.sektor.ald, agregat.totalSektor))} dari sektor PU`} />
        <MetricCard label="Kab/kota dengan ALD" value={fmtNum(kabsWithAld)} unit={`dari ${kabCount || kabs.length}`} />
        <MetricCard label="Peringkat ALD nasional" {...rankProps(provRank)} />
      </div>
      <div>
        <div className="section-label" style={{ marginBottom: 8 }}>Per sektor</div>
        <RpBarList
          rows={sectorRows}
          ariaLabel="Anggaran per sektor PU, bagian Pemprov dan kab/kota"
          legend={[{ color: OTHER_STRONG, label: 'Pemprov' }, { color: OTHER, label: 'Kab/kota' }]}
        />
      </div>
      <Note>{AGREGAT_NOTE}</Note>
    </div>
  );
}

function ProvRincian({ provKode, rows, aldRows, kabList, onOpenKab }) {
  const [open, setOpen] = useState(null);
  const { pemprov, kabs } = provinceBudget(rows, provKode);
  const itemsOf = (kode) => aldRows.filter((x) => x.kode === kode);
  const ranked = kabs.filter((k) => k.sektor.ald > 0).sort((a, b) => b.sektor.ald - a.sektor.ald);
  const zero = kabs.filter((k) => k.sektor.ald === 0).map((k) => k.nama);
  const have = new Set(kabs.map((k) => k.kode));
  const missing = kabList.filter((k) => !have.has(String(k.kode))).map((k) => k.kabkot);
  const pemprovItems = pemprov ? itemsOf(pemprov.kode) : [];

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div>
        <h3 className="text-headline" style={{ margin: '0 0 10px' }}>Pemerintah Provinsi</h3>
        {pemprovItems.length
          ? <AldRincian items={pemprovItems} />
          : <Note>{pemprov ? 'Tidak menganggarkan ALD pada APBD 2026.' : 'APBD Pemprov tidak tersedia.'}</Note>}
      </div>

      <div>
        <h3 className="text-headline" style={{ margin: '0 0 10px' }}>Kab/kota</h3>
        {ranked.length ? (
          <RpBarList
            ariaLabel="Kab/kota menurut anggaran air limbah domestik"
            rows={ranked.map((k) => ({
              key: k.kode, label: k.nama,
              segments: [{ key: 'v', value: k.sektor.ald, color: ALD }],
              expanded: open === k.kode,
              onToggle: () => setOpen(open === k.kode ? null : k.kode),
              children: (
                <div style={{ display: 'grid', gap: 12 }}>
                  <AldRincian items={itemsOf(k.kode)} />
                  {onOpenKab && (
                    <div><button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenKab(k.kode)}>Buka profil {k.nama}</button></div>
                  )}
                </div>
              ),
            }))}
          />
        ) : <Note>Tidak ada kab/kota yang menganggarkan ALD.</Note>}
      </div>

      {(zero.length > 0 || missing.length > 0) && (
        <Note>
          {zero.length > 0 && <>Tanpa ALD: {zero.join(', ')}. </>}
          {missing.length > 0 && <>Tanpa data APBD: {missing.join(', ')}.</>}
        </Note>
      )}
    </div>
  );
}

// ── Card ────────────────────────────────────────────────────────
export default function AnggaranCard({
  kode, nama, rows, aldRows, loading, infra = [], kabList = [], onOpenKab,
}) {
  const [tab, setTab] = useState('ringkasan');
  const isProv = isProvKode(kode);
  const row = rows.find((r) => r.kode === String(kode)) ?? null;
  const hasData = isProv ? rows.some((r) => r.kode.startsWith(String(kode))) : !!row;
  const items = useMemo(() => aldRows.filter((x) => x.kode === String(kode)), [aldRows, kode]);

  const tabs = !loading && hasData && (
    <div className="seg" role="group" aria-label="Tampilan anggaran">
      {[['ringkasan', 'Ringkasan'], ['rincian', 'Rincian ALD']].map(([k, l]) => (
        <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>
      ))}
    </div>
  );

  return (
    <SectionCard title="Anggaran PU Daerah · 2026" subtitle={SUBTITLE} actions={tabs}>
      {loading && <SkeletonPanel rows={2} height={72} />}

      {!loading && !rows.length && (
        <EmptyState compact icon="info" title="Data anggaran belum termuat"
          text='Tambahkan tab "Anggaran PU" dan "Anggaran ALD Rinci" pada Google Sheet sumber.' />
      )}

      {!loading && rows.length > 0 && !hasData && (
        <EmptyState compact icon="info" title={`Tidak ada data APBD untuk ${nama}`}
          text={String(kode).startsWith('31') ? 'APBD DKI Jakarta tidak ada dalam data SIPD 2026.' : undefined} />
      )}

      {!loading && hasData && tab === 'ringkasan' && (isProv
        ? <ProvRingkasan provKode={String(kode)} rows={rows} kabCount={kabList.length} />
        : <KabRingkasan row={row} rows={rows} />)}

      {!loading && hasData && tab === 'rincian' && (isProv
        ? <ProvRincian provKode={String(kode)} rows={rows} aldRows={aldRows} kabList={kabList} onOpenKab={onOpenKab} />
        : <KabRincian row={row} items={items} infra={infra} />)}
    </SectionCard>
  );
}

// National view: every province's ALD (Pemprov + kab/kota) on one scale.
export function AnggaranNasional({ rows, loading, provinces, onOpenProvince }) {
  const provName = Object.fromEntries(provinces.map((p) => [String(p.kode).trim(), p.provinsi]));
  const codes = [...new Set(rows.map((r) => r.kode.slice(0, 2)))];
  const perProv = codes.map((c) => ({ kode: c, ...provinceBudget(rows, c) }))
    .sort((a, b) => b.agregat.sektor.ald - a.agregat.sektor.ald);
  const total = sumAnggaran(rows);
  const withAld = rows.filter((r) => r.sektor.ald > 0).length;

  return (
    <SectionCard title="Anggaran Air Limbah Domestik Daerah · 2026" subtitle={SUBTITLE}>
      {loading && <SkeletonPanel rows={2} height={72} />}
      {!loading && !rows.length && (
        <EmptyState compact icon="info" title="Data anggaran belum termuat"
          text='Tambahkan tab "Anggaran PU" pada Google Sheet sumber.' />
      )}
      {!loading && rows.length > 0 && (
        <div style={{ display: 'grid', gap: 20 }}>
          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
            <MetricCard label="ALD seluruh pemda" tone="ald" value={fmtRp(total.sektor.ald)}
              sub={`${fmtShare(share(total.sektor.ald, total.totalSektor))} dari sektor PU daerah`} />
            <MetricCard label="Pemda dengan ALD" value={fmtNum(withAld)} unit={`dari ${rows.length}`} />
            <MetricCard label="Total sektor PU daerah" value={fmtRp(total.totalSektor)} sub={`Di luar Penunjang ${fmtRp(total.penunjang)}`} />
          </div>
          <RpBarList
            scroll
            ariaLabel="Provinsi menurut anggaran air limbah domestik, Pemprov dan kab/kota"
            legend={[{ color: ALD, label: 'Pemprov' }, { color: ALD_LIGHT, label: 'Kab/kota' }]}
            rows={perProv.map((p) => ({
              key: p.kode, label: provName[p.kode] ?? p.pemprov?.provinsi ?? p.kode,
              segments: [
                { key: 'prov', value: p.pemprov?.sektor.ald ?? 0, color: ALD },
                { key: 'kab', value: p.agregat.sektor.ald - (p.pemprov?.sektor.ald ?? 0), color: ALD_LIGHT },
              ],
              onClick: onOpenProvince ? () => onOpenProvince(p.kode) : undefined,
            }))}
          />
        </div>
      )}
    </SectionCard>
  );
}

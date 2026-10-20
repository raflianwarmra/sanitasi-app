// Anggaran PU daerah (APBD 2026, SIPD) for one Pemprov or kab/kota, in two
// tabs: Ringkasan (ALD against the other PU sectors, rank) and Rincian ALD
// (sub-kegiatan detail; on a province also every kab/kota, expandable).
// Sources: sheets "Anggaran PU" and "Anggaran ALD Rinci".

import { useMemo, useState } from 'react';
import { fmtNum, fmtPct, fmtRp } from '../lib/format';
import {
  SECTORS, DANA, BELANJA, SUMBER_NOTE, PENUNJANG_NOTE, AGREGAT_NOTE,
  provinceBudget, sumAnggaran, aldRank, groupAld, sumSplit, share, isProvKode,
} from '../lib/anggaran';
import SectionCard from './SectionCard';
import MetricCard from './MetricCard';
import EmptyState from './EmptyState';
import { SkeletonPanel } from './LoadingSpinner';
import { ShareBar, RpBarList } from './RpBars';

const ALD = 'var(--viz-ald)';
const ALD_LIGHT = 'var(--viz-ald-light)';
const OTHER = 'var(--viz-muted)';
const OTHER_STRONG = 'var(--viz-neutral)';

// Shares under 1% keep two decimals so a small ALD never reads as "0,0%".
const fmtShare = (v) => fmtPct(v, v != null && v < 1 ? 2 : 1);

// "Modal 70% · Barang & jasa 30%" for the parts that round to at least 1%.
function splitText(split, defs, total) {
  return defs.filter((d) => share(split[d.key], total) >= 0.5)
    .sort((a, b) => split[b.key] - split[a.key])
    .map((d) => `${d.label} ${fmtPct(share(split[d.key], total), 0)}`)
    .join(' · ');
}

// ALD sub-kegiatan of one pemda, grouped by kelompok, amounts right-aligned.
export function AldRincian({ items }) {
  const groups = groupAld(items);
  return (
    <div>
      <div className="ald-cols text-caption2" aria-hidden="true">
        <span>Sub-kegiatan · SKPD</span><span>Keluaran (target RKPD)</span><span>Sumber dana</span><span>Nilai APBD</span>
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
                  <span className="ald-k">Keluaran (RKPD): </span>
                  {it.indikator ? <>{it.indikator}{it.target && <> · <strong className="num" style={{ color: 'var(--ink)' }}>{it.target}</strong></>}</> : '—'}
                </div>
                <div className="ald-dana text-caption">
                  <span className="ald-k">Sumber dana: </span>{it.sumberDana || '—'}
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

function Notes({ children }) {
  return <div className="text-caption" style={{ display: 'grid', gap: 4, lineHeight: 1.55 }}>{children}</div>;
}

function SectorBars({ sektor, ariaLabel }) {
  const rows = SECTORS.map((s) => ({
    key: s.key, label: s.label, selected: s.key === 'ald',
    segments: [{ key: 'v', value: sektor[s.key], color: s.key === 'ald' ? ALD : OTHER }],
  })).sort((a, b) => b.segments[0].value - a.segments[0].value);
  return <RpBarList rows={rows} ariaLabel={ariaLabel} />;
}

function aldShareSegments(sektor) {
  const other = SECTORS.filter((s) => s.key !== 'ald').reduce((t, s) => t + sektor[s.key], 0);
  return [
    { key: 'ald', label: 'Air Limbah Domestik', value: sektor.ald, color: ALD },
    { key: 'other', label: 'Sektor PU lain', value: other, color: OTHER },
  ];
}

// ── Kab/Kota ────────────────────────────────────────────────────
function KabRingkasan({ row, rows }) {
  const provRows = rows.filter((r) => !isProvKode(r.kode) && r.kode.startsWith(row.kode.slice(0, 2)));
  const rProv = aldRank(provRows, row.kode);
  const rNat = aldRank(rows.filter((r) => !isProvKode(r.kode)), row.kode);
  const aldShare = share(row.sektor.ald, row.totalSektor);
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <MetricCard label="Air Limbah Domestik" tone="ald" value={fmtRp(row.sektor.ald)}
          sub={aldShare != null ? `${fmtShare(aldShare)} dari anggaran sektor PU` : undefined} />
        <MetricCard label="Peringkat di provinsi" value={rProv ? fmtNum(rProv.rank) : null} unit={rProv ? `dari ${rProv.of}` : undefined}
          sub={rProv ? 'kab/kota yang menganggarkan ALD' : 'Tidak menganggarkan ALD'} />
        <MetricCard label="Peringkat nasional" value={rNat ? fmtNum(rNat.rank) : null} unit={rNat ? `dari ${rNat.of}` : undefined}
          sub={rNat ? 'kab/kota yang menganggarkan ALD' : 'Tidak menganggarkan ALD'} />
        <MetricCard label="Total sektor PU" value={fmtRp(row.totalSektor)} sub={`Penunjang ${fmtRp(row.penunjang)} di luar total`} />
      </div>

      <div>
        <div className="section-label" style={{ marginBottom: 8 }}>Porsi ALD dalam anggaran sektor PU</div>
        <ShareBar segments={aldShareSegments(row.sektor)} ariaLabel={`Air limbah domestik ${fmtShare(aldShare)} dari anggaran sektor PU`} />
      </div>

      <div>
        <div className="section-label" style={{ marginBottom: 8 }}>Anggaran per sektor</div>
        <SectorBars sektor={row.sektor} ariaLabel={`Anggaran per sektor PU ${row.nama}, urut terbesar`} />
      </div>

      <Notes><span>{SUMBER_NOTE}</span><span>{PENUNJANG_NOTE}</span></Notes>
    </div>
  );
}

function KabRincian({ row, items, infra }) {
  const total = row.sektor.ald;
  const dana = sumSplit(items, 'dana', DANA);
  const belanja = sumSplit(items, 'belanja', BELANJA);
  const byGroup = Object.fromEntries(groupAld(items).map((g) => [g.kelompok, g.total]));
  const units = (type) => infra.filter((i) => i.type === type);
  const ipal = units('IPAL');
  const iplt = units('IPLT');
  const broken = infra.filter((i) => !i.isFunctioning).length;
  const om = byGroup['Operasi & Pemeliharaan'] ?? 0;

  if (!items.length) {
    return (
      <EmptyState compact icon="droplet" title={`${row.nama} tidak menganggarkan program air limbah domestik`}
        text="Tidak ada sub-kegiatan program 1.03.05 dengan nilai pada APBD 2026." />
    );
  }
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <MetricCard label="Total ALD" tone="ald" value={fmtRp(total)} sub={`${items.length} sub-kegiatan`} />
        <MetricCard label="Porsi DAK" value={fmtPct(share(dana.dak, total), 0)} sub={`Sumber dana: ${splitText(dana, DANA, total)}`} />
        <MetricCard label="Belanja modal" value={fmtPct(share(belanja.modal, total), 0)} sub={splitText(belanja, BELANJA, total)} />
      </div>

      {infra.length > 0 && (
        <div className="inset inset-sm text-body">
          Infrastruktur tercatat: <strong className="num">{ipal.length}</strong> IPAL dan <strong className="num">{iplt.length}</strong> IPLT
          {broken > 0 && <> ({broken} tidak berfungsi)</>}. Anggaran 2026 untuk operasi & pemeliharaan SPALD <strong className="num">{fmtRp(om)}</strong>,
          IPLT & lumpur tinja <strong className="num">{fmtRp(byGroup['IPLT & Lumpur Tinja'] ?? 0)}</strong>.
          {om === 0 && <span style={{ color: 'var(--warn)' }}> Belum ada anggaran O&M untuk unit yang tercatat.</span>}
        </div>
      )}

      <AldRincian items={items} />
      <Notes><span>{SUMBER_NOTE} Keluaran dan target dari RKPD 2026 untuk sub-kegiatan yang sama.</span></Notes>
    </div>
  );
}

// ── Provinsi ────────────────────────────────────────────────────
function ProvRingkasan({ provKode, rows, kabCount }) {
  const { pemprov, kabs, agregat } = provinceBudget(rows, provKode);
  const kabsWithAld = kabs.filter((k) => k.sektor.ald > 0).length;

  // National rank of the province aggregate.
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

  const shareRows = [
    pemprov && { key: 'prov', label: 'Pemprov', sektor: pemprov.sektor, total: pemprov.totalSektor },
    { key: 'agg', label: 'Agregat', sektor: agregat.sektor, total: agregat.totalSektor },
  ].filter(Boolean);

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <MetricCard label="ALD Pemprov" tone="ald" value={pemprov ? fmtRp(pp.ald) : null}
          sub={!pemprov ? 'APBD Pemprov tidak tersedia' : pp.ald > 0 ? `${fmtShare(share(pp.ald, pemprov.totalSektor))} dari sektor PU Pemprov` : 'Pemprov tidak menganggarkan ALD'} />
        <MetricCard label="ALD agregat" tone="ald" value={fmtRp(agregat.sektor.ald)}
          sub={`Pemprov + ${kabs.length} kab/kota · ${fmtShare(share(agregat.sektor.ald, agregat.totalSektor))} dari sektor PU`} />
        <MetricCard label="Kab/kota menganggarkan ALD" value={fmtNum(kabsWithAld)} unit={`dari ${kabCount || kabs.length}`}
          sub={kabCount > kabs.length ? `${kabCount - kabs.length} tanpa data APBD` : undefined} />
        <MetricCard label="Peringkat nasional" value={provRank ? fmtNum(provRank.rank) : null} unit={provRank ? `dari ${provRank.of}` : undefined}
          sub="provinsi, menurut ALD agregat" />
      </div>

      <div>
        <div className="section-label" style={{ marginBottom: 8 }}>Porsi ALD dalam anggaran sektor PU</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {shareRows.map((r) => (
            <div key={r.key} className="share-row">
              <span className="text-caption">{r.label}</span>
              <ShareBar segments={aldShareSegments(r.sektor)} ariaLabel={`${r.label}: air limbah domestik ${fmtShare(share(r.sektor.ald, r.total))} dari ${fmtRp(r.total)}`} />
              <span className="num text-caption" style={{ color: 'var(--ink)', fontWeight: 600 }}>{fmtShare(share(r.sektor.ald, r.total))}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="section-label" style={{ marginBottom: 8 }}>Anggaran per sektor, Pemprov dan kab/kota pada skala yang sama</div>
        <RpBarList
          rows={sectorRows}
          ariaLabel="Anggaran agregat per sektor PU, bagian Pemprov dan kab/kota"
          legend={[
            { color: OTHER_STRONG, label: 'Pemprov' },
            { color: OTHER, label: 'Kab/kota' },
            { color: ALD, label: 'Air Limbah Domestik (bagian kab/kota lebih muda)' },
          ]}
        />
      </div>

      <Notes>
        <span>{AGREGAT_NOTE}</span>
        <span>{SUMBER_NOTE}</span>
        <span>{PENUNJANG_NOTE} Penunjang Pemprov {fmtRp(pemprov?.penunjang)}, agregat {fmtRp(agregat.penunjang)}.</span>
      </Notes>
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
          : <div className="text-caption">{pemprov ? 'Pemprov tidak menganggarkan program air limbah domestik pada APBD 2026.' : 'APBD Pemprov tidak tersedia pada ekstrak SIPD.'}</div>}
      </div>

      <div>
        <h3 className="text-headline" style={{ margin: '0 0 4px' }}>Kab/kota, urut anggaran ALD</h3>
        <div className="text-caption" style={{ marginBottom: 12 }}>Buka baris untuk melihat sub-kegiatan.</div>
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
        ) : <div className="text-caption">Tidak ada kab/kota yang menganggarkan ALD.</div>}
      </div>

      <Notes>
        {zero.length > 0 && <span>Tanpa anggaran ALD: {zero.join(', ')}.</span>}
        {missing.length > 0 && <span>APBD tidak tersedia: {missing.join(', ')}.</span>}
        <span>{SUMBER_NOTE} Keluaran dan target dari RKPD 2026 untuk sub-kegiatan yang sama.</span>
      </Notes>
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

  const dki = String(kode).startsWith('31');
  return (
    <SectionCard title="Anggaran PU Daerah · 2026" subtitle='APBD 2026 (SIPD) · sumber: sheet "Anggaran PU" & "Anggaran ALD Rinci"' actions={tabs}>
      {loading && <SkeletonPanel rows={2} height={72} />}

      {!loading && !rows.length && (
        <EmptyState compact icon="info" title="Data anggaran belum termuat"
          text='Tambahkan tab "Anggaran PU" dan "Anggaran ALD Rinci" pada Google Sheet sumber agar anggaran tampil di sini.' />
      )}

      {!loading && rows.length > 0 && !hasData && (
        <EmptyState compact icon="info" title={`APBD bidang PU tidak tersedia untuk ${nama}`}
          text={dki
            ? 'Kota/kabupaten administrasi DKI Jakarta tidak memiliki APBD sendiri, dan APBD Pemprov DKI tidak ada dalam ekstrak SIPD 2026.'
            : 'Ekstrak APBD 2026 (SIPD) tidak memuat baris untuk pemda ini.'} />
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
  const missing = provinces.filter((p) => !codes.includes(String(p.kode).trim())).map((p) => p.provinsi);

  return (
    <SectionCard title="Anggaran Air Limbah Domestik Daerah · 2026" subtitle='APBD 2026 (SIPD) · sumber: sheet "Anggaran PU"'>
      {loading && <SkeletonPanel rows={2} height={72} />}
      {!loading && !rows.length && (
        <EmptyState compact icon="info" title="Data anggaran belum termuat"
          text='Tambahkan tab "Anggaran PU" pada Google Sheet sumber agar anggaran tampil di sini.' />
      )}
      {!loading && rows.length > 0 && (
        <div style={{ display: 'grid', gap: 20 }}>
          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
            <MetricCard label="ALD seluruh pemda" tone="ald" value={fmtRp(total.sektor.ald)}
              sub={`${fmtShare(share(total.sektor.ald, total.totalSektor))} dari anggaran sektor PU daerah (${fmtRp(total.totalSektor)})`} />
            <MetricCard label="Pemda menganggarkan ALD" value={fmtNum(withAld)} unit={`dari ${rows.length}`}
              sub="Pemprov dan kab/kota dengan data APBD" />
            <MetricCard label="Program Penunjang" value={fmtRp(total.penunjang)} sub="di luar total sektor" />
          </div>
          <RpBarList
            scroll
            ariaLabel="Provinsi menurut anggaran air limbah domestik agregat"
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
          <Notes>
            <span>{AGREGAT_NOTE}</span>
            <span>{SUMBER_NOTE}{missing.length > 0 && ` Tidak ada dalam ekstrak APBD: ${missing.join(', ')}.`}</span>
          </Notes>
        </div>
      )}
    </SectionCard>
  );
}

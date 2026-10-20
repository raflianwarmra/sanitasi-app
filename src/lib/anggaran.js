// Anggaran PU (APBD 2026, SIPD) helpers shared by AnggaranCard and the
// national view. Rows come from normalizeAnggaran / normalizeAnggaranAld.

// The one caveat shown on a province: what the Pemprov + kab/kota sum leaves out.
export const AGREGAT_NOTE = 'Pemprov + kab/kota tidak mencakup bantuan keuangan provinsi (dicatat di luar urusan PU).';

export const SECTORS = [
  { key: 'jalan', label: 'Jalan' },
  { key: 'ald', label: 'ALD' },
  { key: 'airMinum', label: 'Air Minum' },
  { key: 'persampahan', label: 'Persampahan' },
  { key: 'lainnya', label: 'Lainnya PU' },
];

export const DANA = [
  { key: 'dak', label: 'DAK' },
  { key: 'dau', label: 'DAU' },
  { key: 'pad', label: 'PAD' },
  { key: 'bagiHasil', label: 'Bagi hasil' },
  { key: 'lainnya', label: 'Lainnya' },
];

export const BELANJA = [
  { key: 'modal', label: 'Modal' },
  { key: 'barangJasa', label: 'Barang & jasa' },
  { key: 'hibahBansos', label: 'Hibah & bansos' },
  { key: 'pegawai', label: 'Pegawai' },
];

export const isProvKode = (kode) => String(kode).length === 2;

// Sum several pemda rows into one (province aggregate, national total).
export function sumAnggaran(rows) {
  const sektor = Object.fromEntries(SECTORS.map((s) => [s.key, 0]));
  let totalSektor = 0;
  let penunjang = 0;
  rows.forEach((r) => {
    SECTORS.forEach((s) => { sektor[s.key] += r.sektor[s.key]; });
    totalSektor += r.totalSektor;
    penunjang += r.penunjang;
  });
  return { sektor, totalSektor, penunjang };
}

// Pemprov row, its kab/kota rows and their sum, for a 2-digit province kode.
export function provinceBudget(rows, provKode) {
  const pemprov = rows.find((r) => r.kode === provKode) ?? null;
  const kabs = rows.filter((r) => !isProvKode(r.kode) && r.kode.startsWith(provKode));
  return { pemprov, kabs, agregat: sumAnggaran(pemprov ? [pemprov, ...kabs] : kabs) };
}

// Rank by ALD amount among the pemda that budget for ALD at all.
// Returns null when the pemda itself has no ALD budget.
export function aldRank(rows, kode) {
  const withAld = rows.filter((r) => r.sektor.ald > 0).sort((a, b) => b.sektor.ald - a.sektor.ald);
  const i = withAld.findIndex((r) => r.kode === kode);
  return i < 0 ? null : { rank: i + 1, of: withAld.length };
}

// ALD sub-kegiatan of one pemda, grouped by kelompok; groups and items
// sorted by amount, largest first.
export function groupAld(items) {
  const groups = new Map();
  items.forEach((it) => {
    const g = groups.get(it.kelompok) ?? { kelompok: it.kelompok, total: 0, items: [] };
    g.total += it.nilai;
    g.items.push(it);
    groups.set(it.kelompok, g);
  });
  return [...groups.values()]
    .map((g) => ({ ...g, items: [...g.items].sort((a, b) => b.nilai - a.nilai) }))
    .sort((a, b) => b.total - a.total);
}

// Sum a split ({dak, dau, …}) across sub-kegiatan rows.
export function sumSplit(items, field, defs) {
  const out = Object.fromEntries(defs.map((d) => [d.key, 0]));
  items.forEach((it) => defs.forEach((d) => { out[d.key] += it[field][d.key]; }));
  return out;
}

export const share = (part, whole) => (whole > 0 ? (part / whole) * 100 : null);

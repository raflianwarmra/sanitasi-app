// BUMD Air Minum helpers shared by the Kab/Kota card and exports.

// Kategori kinerja BUMD AM (skala nilai 0–5): Sakit < 2,2 ≤ Kurang Sehat ≤ 2,8 < Sehat.
export const BUMD_THRESHOLDS = { sakit: 2.2, sehat: 2.8, max: 5 };

// A BUMD row may serve several kab/kota (e.g. PAM Jaya → all DKI codes).
export function findBumd(rows, kode) {
  return rows.find((b) => b.kodes.includes(String(kode))) ?? null;
}

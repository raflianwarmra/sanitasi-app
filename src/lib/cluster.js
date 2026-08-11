// Cluster Tata Kelola — A through F classification
// Source: national policy grouping for kab/kota sanitation governance maturity.
// The sheet stores the raw policy letter (A = needs full intervention ... F =
// complete governance). We display it inverted so A = best, F = worst, matching
// the familiar school-grade convention.

const RAW_TO_DISPLAY = { A: 'F', B: 'E', C: 'D', D: 'C', E: 'B', F: 'A' };

export const CLUSTER_LABELS = {
  A: 'Tata Kelola Lengkap',
  B: 'Lengkapi Satu Regulasi',
  C: 'Percepat Penyusunan Regulasi',
  D: 'Fokus Pemisahan Kelembagaan',
  E: 'Lengkapi Regulasi + Bentuk Kelembagaan',
  F: 'Intervensi Menyeluruh (Khususnya PPSP)',
};

export const CLUSTER_COLORS = {
  A: 'var(--ok)',
  B: 'var(--warn)',
  C: 'var(--warn)',
  D: 'var(--warn)',
  E: 'var(--bad)',
  F: 'var(--bad)',
};

// Extract the A–F letter exactly as written in the sheet (no display remapping).
export function rawClusterLetter(raw) {
  if (!raw) return null;
  const m = String(raw).trim().match(/^([A-Fa-f])\b/);
  if (m) return m[1].toUpperCase();
  // Sometimes cell may be "Cluster B" or "B - something"
  const m2 = String(raw).toUpperCase().match(/\b([A-F])\b/);
  return m2 ? m2[1] : null;
}

// Display letter — A = best, F = worst (inverted from the sheet's raw policy letter).
export function clusterLetter(raw) {
  const L = rawClusterLetter(raw);
  return L ? RAW_TO_DISPLAY[L] : null;
}

export function clusterLabel(raw) {
  const L = clusterLetter(raw);
  return L ? CLUSTER_LABELS[L] : null;
}

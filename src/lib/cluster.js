// Cluster Tata Kelola — A through F classification
// Source: national policy grouping for kab/kota sanitation governance maturity.

export const CLUSTER_LABELS = {
  A: 'Intervensi Menyeluruh (Khususnya PPSP)',
  B: 'Lengkapi Regulasi + Bentuk Kelembagaan',
  C: 'Fokus Pemisahan Kelembagaan',
  D: 'Percepat Penyusunan Regulasi',
  E: 'Lengkapi Satu Regulasi',
  F: 'Tata Kelola Lengkap',
};

export const CLUSTER_COLORS = {
  A: 'var(--bad)',
  B: 'var(--bad)',
  C: 'var(--warn)',
  D: 'var(--warn)',
  E: 'var(--warn)',
  F: 'var(--ok)',
};

// Extract the A–F letter from whatever free-form string the sheet contains.
export function clusterLetter(raw) {
  if (!raw) return null;
  const m = String(raw).trim().match(/^([A-Fa-f])\b/);
  if (m) return m[1].toUpperCase();
  // Sometimes cell may be "Cluster B" or "B - something"
  const m2 = String(raw).toUpperCase().match(/\b([A-F])\b/);
  return m2 ? m2[1] : null;
}

export function clusterLabel(raw) {
  const L = clusterLetter(raw);
  return L ? CLUSTER_LABELS[L] : null;
}

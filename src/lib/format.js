// Shared formatting helpers — single source of truth for number/text display.

export function fmtPct(v, digits = 2) {
  return v == null ? '—' : `${Number(v).toFixed(digits).replace('.', ',')}%`;
}

export function fmtNum(v, digits = 0) {
  if (v == null || isNaN(v)) return '—';
  return Number(v).toLocaleString('id-ID', { maximumFractionDigits: digits });
}

// For CSV cells: id-ID decimal comma, empty when null.
export function csvNum(v, digits = 2) {
  if (v == null || isNaN(v)) return '';
  return Number(v).toFixed(digits).replace('.', ',');
}

export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function todayLabel() {
  return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

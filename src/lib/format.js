// Shared formatting helpers — single source of truth for number/text display.

export function fmtPct(v, digits = 2) {
  return v == null ? '—' : `${Number(v).toFixed(digits).replace('.', ',')}%`;
}

export function fmtNum(v, digits = 0) {
  if (v == null || isNaN(v)) return '—';
  return Number(v).toLocaleString('id-ID', { maximumFractionDigits: digits });
}

// Rupiah in planning-meeting units: "Rp1,47 miliar", "−Rp51,29 miliar".
export function fmtRp(v) {
  if (v == null || isNaN(v)) return '—';
  const abs = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  const [div, unit, digits] = abs >= 1e12 ? [1e12, ' triliun', 2]
    : abs >= 1e9 ? [1e9, ' miliar', 2]
      : abs >= 1e6 ? [1e6, ' juta', 0]
        : [1, '', 0];
  const n = (abs / div).toLocaleString('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${sign}Rp${n}${unit}`;
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

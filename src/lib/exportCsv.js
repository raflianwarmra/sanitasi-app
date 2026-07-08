// Client-side CSV export.
// Semicolon delimiter + decimal commas: opens cleanly in Excel with the
// Indonesian locale, and Google Sheets auto-detects it. UTF-8 BOM included.

const DELIM = ';';
const BOM = '﻿';

function cell(v) {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(DELIM) || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function saveBlob(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * @param {string} filename
 * @param {Array<{key: string, label: string}>} columns
 * @param {Array<Object>} rows objects keyed by column key
 */
export function downloadCsv(filename, columns, rows) {
  const head = columns.map((c) => cell(c.label)).join(DELIM);
  const body = rows.map((r) => columns.map((c) => cell(r[c.key])).join(DELIM));
  saveBlob(filename, BOM + [head, ...body].join('\r\n'));
}

/** Multi-section CSV (e.g. kab/kota profile: akses + infra + kelembagaan + catatan). */
export function downloadCsvSections(filename, sections) {
  const parts = sections
    .filter((s) => s && s.columns)
    .map((s) => {
      const head = s.columns.map((c) => cell(c.label)).join(DELIM);
      const body = (s.rows ?? []).map((r) => s.columns.map((c) => cell(r[c.key])).join(DELIM));
      return [cell(s.title), head, ...body].join('\r\n');
    });
  saveBlob(filename, BOM + parts.join('\r\n\r\n'));
}

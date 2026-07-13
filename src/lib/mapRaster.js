// Client-side choropleth rasterizer for PPTX export: builds an SVG string
// from the same generated geometry + metric ramps the interactive map uses,
// then draws it onto a canvas and returns a PNG data-URL. No screenshots,
// no server — pure browser.

import { makeProjection, geometryToPath, loadProvinceGeo, loadNationalGeo } from './geo';
import { bandOf } from './mapMetrics';

const NO_DATA_FILL = '#DCE1EA';

// Mirrors the interactive map's name fallback (kept tiny and local: the
// component version lives in ProvinceKabkotMap and is not exported).
function normName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\b(kabupaten|kab\.?|adm\.?|administrasi)\b/g, '')
    .replace(/[^a-z]/g, '');
}

/**
 * @param {string} provKode 2-digit BPS kode, or 'ID' for the national map
 * @param {Array} rows data rows ({kode, kabkot, <metric keys>})
 * @param {Object} metricDef entry from MAP_METRICS
 * @returns {Promise<{png: string, width: number, height: number}|null>}
 */
export async function renderChoroplethPng({ provKode, rows, metricDef, width = 1400, height = 980 }) {
  let fc;
  try {
    fc = await (provKode === 'ID' ? loadNationalGeo() : loadProvinceGeo(provKode));
  } catch {
    return null; // geometry unavailable -> caller renders a text fallback
  }
  const features = fc?.features ?? [];
  if (!features.length) return null;

  const project = makeProjection(features, width, height, 24);
  if (!project) return null;

  const byKode = new Map(rows.map((k) => [String(k.kode), k]));
  const byName = new Map(rows.map((k) => [normName(k.kabkot), k]));

  let paths = '';
  for (const ft of features) {
    const row = byKode.get(String(ft.properties.kode)) ?? byName.get(normName(ft.properties.nama));
    const val = row ? row[metricDef.key] : null;
    const band = bandOf(val, metricDef.thresholds);
    const fill = band < 0 ? NO_DATA_FILL : metricDef.ramp[band];
    paths += `<path d="${geometryToPath(ft.geometry, project)}" fill="${fill}" stroke="#FFFFFF" stroke-width="1.6"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${paths}</svg>`;

  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0);
    return { png: canvas.toDataURL('image/png'), width, height };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

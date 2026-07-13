// Vector choropleth builder for PPTX export: converts the same generated
// geometry + metric ramps the interactive map uses into pptxgenjs
// CUSTOM_GEOMETRY point arrays (inches, relative to the map box) — a true
// vector map in the deck, not a raster image.

import { makeProjection, loadProvinceGeo, loadNationalGeo } from './geo';
import { bandOf } from './mapMetrics';

const NO_DATA_FILL = 'DCE1EA';
const MAX_RING_POINTS = 140; // decimate very dense rings for file size

function normName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\b(kabupaten|kab\.?|adm\.?|administrasi)\b/g, '')
    .replace(/[^a-z]/g, '');
}

const r3 = (n) => Math.round(n * 1000) / 1000;

function ringToPoints(ring, project) {
  const step = Math.max(1, Math.ceil(ring.length / MAX_RING_POINTS));
  const pts = [];
  for (let i = 0; i < ring.length; i += step) {
    const [x, y] = project(ring[i]);
    pts.push(pts.length === 0 ? { x: r3(x), y: r3(y), moveTo: true } : { x: r3(x), y: r3(y) });
  }
  pts.push({ close: true });
  return pts;
}

/**
 * @param {string} provKode 2-digit BPS kode, or 'ID' for the national map
 * @param {Array} rows data rows ({kode, kabkot, <metric keys>})
 * @param {Object} metricDef entry from MAP_METRICS
 * @param {number} w map box width in inches
 * @param {number} h map box height in inches
 * @returns {Promise<Array<{points: Array, fill: string}>|null>} one entry
 *   per polygon ring (MultiPolygon areas emit several), or null when
 *   geometry is unavailable.
 */
export async function buildChoroplethShapes({ provKode, rows, metricDef, w, h }) {
  let fc;
  try {
    fc = await (provKode === 'ID' ? loadNationalGeo() : loadProvinceGeo(provKode));
  } catch {
    return null;
  }
  const features = fc?.features ?? [];
  if (!features.length) return null;

  const project = makeProjection(features, w, h, 0.06);
  if (!project) return null;

  const byKode = new Map(rows.map((k) => [String(k.kode), k]));
  const byName = new Map(rows.map((k) => [normName(k.kabkot), k]));

  const shapes = [];
  for (const ft of features) {
    const row = byKode.get(String(ft.properties.kode)) ?? byName.get(normName(ft.properties.nama));
    const val = row ? row[metricDef.key] : null;
    const band = bandOf(val, metricDef.thresholds);
    const fill = band < 0 ? NO_DATA_FILL : metricDef.ramp[band].replace('#', '');
    const g = ft.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    for (const poly of polys) {
      // Outer ring only: interior holes are negligible at deck scale.
      if (poly[0]?.length >= 4) shapes.push({ points: ringToPoints(poly[0], project), fill });
    }
  }
  return shapes;
}

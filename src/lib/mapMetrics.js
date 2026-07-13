// Choropleth metric definitions — shared by ProvinceKabkotMap and the
// Provinsi page (metric selector, top/bottom lists).

// Sequential 5-step ramps (light -> strong). Fixed hexes: fills must stay
// stable across themes; strokes/labels adapt via CSS variables.
const RAMP_TEAL = ['#E8F2F5', '#BFDEE7', '#8CC1D1', '#4E9AB2', '#19708D'];
const RAMP_BLUE = ['#E9EEF8', '#C4D2EE', '#97AFDE', '#6386C7', '#3459A8'];
const RAMP_ROSE = ['#FBECEA', '#F3C9C2', '#E79C90', '#D6685A', '#B93A2C'];

export const MAP_METRICS = {
  aman: { key: 'aman2025', label: 'Akses Aman', thresholds: [5, 10, 20, 30], ramp: RAMP_TEAL, higherBetter: true },
  layak: { key: 'layak2025', label: 'Akses Layak', thresholds: [20, 50, 80, 90], ramp: RAMP_BLUE, higherBetter: true },
  babs: { key: 'babs2025', label: 'BABS Terbuka', thresholds: [1, 5, 10, 20], ramp: RAMP_ROSE, higherBetter: false },
};

// Threshold banding shared by the interactive map and the PPTX rasterizer.
export function bandOf(value, thresholds) {
  if (value == null || isNaN(value)) return -1;
  let b = 0;
  for (const t of thresholds) { if (value >= t) b++; }
  return b;
}

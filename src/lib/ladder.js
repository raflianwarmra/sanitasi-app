// Sanitation-ladder color mapping — shared by LadderChart (HTML segmented
// bar, uses CSS vars directly) and NationalView (Chart.js, needs resolved
// colors).

import { cssVar } from './theme';

const COLOR_RULES = [
  { test: /aman terpusat/, token: '--viz-aman-deep' },
  { test: /aman setempat/, token: '--viz-aman' },
  { test: /layak sendiri/, token: '--viz-layak' },
  { test: /layak bersama/, token: '--viz-layak-light' },
  { test: /belum layak/, token: '--viz-muted' },
  { test: /babs tertutup/, token: '--viz-babs-light' },
  { test: /babs/, token: '--viz-babs' },
  { test: /aman/, token: '--viz-aman' },
];

function tokenOf(label) {
  const l = String(label).toLowerCase();
  return COLOR_RULES.find((r) => r.test.test(l))?.token ?? '--viz-muted';
}

// For HTML/CSS: follows theme changes automatically.
export function ladderColorVar(label) {
  return `var(${tokenOf(label)})`;
}

// For canvas (Chart.js): resolved value of the same token.
export function ladderColor(label) {
  return cssVar(tokenOf(label));
}

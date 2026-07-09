// Sanitation-ladder color mapping — shared by LadderChart (province/kab
// stacked bar) and NationalView (year-series variant).

import { cssVar } from './theme';

const COLOR_RULES = [
  { test: /aman terpusat/, color: () => '#0F5568' },
  { test: /aman setempat/, color: () => cssVar('--viz-aman') },
  { test: /layak sendiri/, color: () => cssVar('--viz-layak') },
  { test: /layak bersama/, color: () => '#97AFDE' },
  { test: /belum layak/, color: () => cssVar('--viz-muted') },
  { test: /babs tertutup/, color: () => cssVar('--warn') },
  { test: /babs/, color: () => cssVar('--viz-babs') },
  { test: /aman/, color: () => cssVar('--viz-aman') },
];

export function ladderColor(label) {
  const l = String(label).toLowerCase();
  const rule = COLOR_RULES.find((r) => r.test.test(l));
  return rule ? rule.color() : cssVar('--viz-muted');
}

#!/usr/bin/env python3
"""Systematic geometry validation for public/geo against the Akses Kabkot
sheet. Checks all 38 province files + the national file:

1. Coverage: every sheet kode has exactly one feature, in its own file.
2. No duplicate/foreign kode in any file.
3. Centroid coherence: each kab centroid vs its province's mean centroid;
   flags outliers (> max(3.5x median, 1.2 deg)) that suggest a shape
   assigned from the wrong province.
4. National file: 38 features matching the sheet's province kode set.

Usage: python3 scripts/validate_geo.py /tmp/kabkot_sheet.csv > docs/geo-validation.md
"""
import csv
import glob
import json
import math
import sys
from collections import defaultdict
from pathlib import Path

GEO = Path(__file__).resolve().parent.parent / 'public' / 'geo'


def centroid(geometry):
    xs, ys, n = 0.0, 0.0, 0
    def walk(c):
        nonlocal xs, ys, n
        if isinstance(c[0], (int, float)):
            xs += c[0]; ys += c[1]; n += 1
        else:
            for x in c:
                walk(x)
    walk(geometry['coordinates'])
    return (xs / n, ys / n) if n else (None, None)


def main(csv_path):
    rows = list(csv.DictReader(open(csv_path)))
    sheet = {r['Kode'].strip(): (r['Prov'].strip(), r['Kabkot'].strip()) for r in rows}
    by_prefix = defaultdict(set)
    for k in sheet:
        by_prefix[k[:2]].add(k)

    problems = []
    seen = {}
    lines = ['# Geo Validation Report', '',
             f'Sheet rows: {len(sheet)} kab/kota across {len(by_prefix)} provinces.', '',
             '| Prov | File features | Sheet kabs | Missing | Foreign | Centroid outliers |',
             '|---|---|---|---|---|---|']

    for pf in sorted(glob.glob(str(GEO / 'prov-*.json'))):
        fc = json.load(open(pf))
        prefix = Path(pf).stem.split('-')[1]
        kodes = [str(f['properties']['kode']) for f in fc['features']]
        dupes = {k for k in kodes if kodes.count(k) > 1}
        foreign = [k for k in kodes if k[:2] != prefix or k not in sheet]
        missing = sorted(by_prefix[prefix] - set(kodes))
        for k in kodes:
            if k in seen:
                problems.append(f'kode {k} appears in both {seen[k]} and {Path(pf).name}')
            seen[k] = Path(pf).name
        if dupes:
            problems.append(f'{Path(pf).name}: duplicate kode {sorted(dupes)}')

        cents = {str(f['properties']['kode']): centroid(f['geometry']) for f in fc['features']}
        cx = sum(c[0] for c in cents.values()) / len(cents)
        cy = sum(c[1] for c in cents.values()) / len(cents)
        dists = {k: math.hypot(c[0] - cx, c[1] - cy) for k, c in cents.items()}
        med = sorted(dists.values())[len(dists) // 2]
        thr = max(3.5 * med, 1.2)
        outliers = [f'{k} ({sheet.get(k, ("?", "?"))[1]}, {d:.1f}deg)'
                    for k, d in dists.items() if d > thr]
        for o in outliers:
            problems.append(f'{Path(pf).name}: centroid outlier {o}')
        lines.append(f'| {prefix} {sheet[min(by_prefix[prefix])][0]} | {len(kodes)} | '
                     f'{len(by_prefix[prefix])} | {len(missing)} | {len(foreign)} | {len(outliers)} |')
        if missing:
            problems.append(f'{Path(pf).name}: missing {missing}')
        if foreign:
            problems.append(f'{Path(pf).name}: foreign kode {foreign}')

    nat = json.load(open(GEO / 'indonesia-provinces.json'))
    nat_kodes = sorted(str(f['properties']['kode']) for f in nat['features'])
    lines += ['', f'National file: {len(nat_kodes)} provinces '
              f'({"matches" if set(nat_kodes) == set(by_prefix) else "MISMATCH vs"} sheet prefixes).']

    lines += ['', '## Problems', '']
    lines += [f'- {p}' for p in problems] if problems else ['None — all checks passed.']
    print('\n'.join(lines))
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1]))

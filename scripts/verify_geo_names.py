#!/usr/bin/env python3
"""Name-truth swap detector: verifies every generated kab/kota shape sits at
the geographic location of the kab/kota it is LABELED as — catching kode
swaps (e.g. Sulsel Maros/Bone under kemendagri-vs-BPS numbering) that a
coverage check alone misses.

For each output feature (kode, nama), it compares the shape's centroid to the
centroid of the source feature that NAME-matches that kab within its province.
Distances > 0.5 deg (~55 km) are flagged as suspected swaps.

Note: Kabupaten-vs-Kota pairs sharing a base name (e.g. Kab. Jayapura /
Kota Jayapura) may false-positive because loose naming collapses "kota";
verify such flags manually against point counts.

Usage:
  python3 scripts/verify_geo_names.py <marifauzan.json> <azunzios.geojson> <kabkot.csv>
"""
import csv
import glob
import json
import math
import re
import sys
from pathlib import Path

GEO = Path(__file__).resolve().parent.parent / 'public' / 'geo'
_ALIAS = {'pasir': 'paser', 'tanahtidung': 'tanatidung'}


def norm(s):
    s = (s or '').lower()
    s = re.sub(r'\b(kabupaten|kab\.?|adm\.?|administrasi)\b', '', s)
    return re.sub(r'[^a-z]', '', s)


def loose(s):
    s = (s or '').lower()
    s = re.sub(r'\b(kota\s?madya|kotamadya|kodya|kota)\b', '', s)
    s = norm(s)
    return _ALIAS.get(s, s)


def centroid(g):
    xs, ys = [], []
    def walk(c):
        if isinstance(c[0], (int, float)):
            xs.append(c[0]); ys.append(c[1])
        else:
            for x in c:
                walk(x)
    walk(g['coordinates'])
    return sum(xs) / len(xs), sum(ys) / len(ys)


def main(mari, azun, csv_path):
    truth = {}
    for path, nk, pk in [(mari, 'WADMKK', 'WADMPR'), (azun, 'NAME_2', 'NAME_1')]:
        for ft in json.load(open(path))['features']:
            if ft.get('geometry'):
                p = ft['properties']
                truth.setdefault((norm(p.get(pk)), loose(p.get(nk))), centroid(ft['geometry']))

    prov_of = {r['Kode'].strip(): (norm(r['Prov']), loose(r['Kabkot']), r['Prov'], r['Kabkot'])
               for r in csv.DictReader(open(csv_path))}

    bad, nocheck = [], 0
    for pf in glob.glob(str(GEO / 'prov-*.json')):
        for f in json.load(open(pf))['features']:
            kode = str(f['properties']['kode'])
            pr, lk, prov, kab = prov_of.get(kode, (None, None, None, None))
            t = truth.get((pr, lk))
            if t is None:
                nocheck += 1
                continue
            c = centroid(f['geometry'])
            d = math.hypot(c[0] - t[0], c[1] - t[1])
            if d > 0.5:
                bad.append((kode, prov, kab, round(d, 2)))

    print(f'Checked {sum(len(json.load(open(pf))["features"]) for pf in glob.glob(str(GEO / "prov-*.json"))) - nocheck} shapes against name-truth; {nocheck} unmatched.')
    for b in sorted(bad, key=lambda x: -x[3]):
        print('  SUSPECT SWAP:', b)
    return 1 if bad else 0


if __name__ == '__main__':
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    sys.exit(main(*sys.argv[1:4]))

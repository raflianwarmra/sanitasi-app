#!/usr/bin/env python3
"""Build the national province-level GeoJSON for the Nasional choropleth.

Dissolves kabupaten/kota boundaries (same sources as build_geo.py) into one
polygon per province, keyed by 2-digit BPS kode. Requires shapely:

  python3 -m venv /tmp/geoenv && /tmp/geoenv/bin/pip install shapely
  /tmp/geoenv/bin/python scripts/build_national_geo.py \
      /tmp/kab_marifauzan.json /tmp/kab_azunzios.geojson /tmp/kabkot_sheet.csv

Output: public/geo/indonesia-provinces.json
  FeatureCollection; properties {kode: "32", nama: "Jawa Barat"}.
"""
import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

from shapely.geometry import shape, mapping
from shapely.ops import unary_union

OUT = Path(__file__).resolve().parent.parent / 'public' / 'geo' / 'indonesia-provinces.json'


def norm(s):
    s = (s or '').lower()
    s = re.sub(r'\b(kabupaten|kab\.?|adm\.?|administrasi)\b', '', s)
    s = re.sub(r'[^a-z]', '', s)
    return s


def index_source(feats, kode_key, name_key, prov_key, strip_dots=False):
    by_kode, by_pair, by_name = {}, {}, defaultdict(list)
    for ft in feats:
        if not ft.get('geometry'):
            continue
        p = ft['properties']
        k = str(p.get(kode_key) or '').strip()
        if strip_dots:
            k = k.replace('.', '')
        if k:
            by_kode.setdefault(k, ft)
        nm, pr = norm(p.get(name_key)), norm(p.get(prov_key))
        if nm:
            by_pair.setdefault((pr, nm), ft)
            by_name[nm].append(ft)
    return by_kode, by_pair, by_name


def resolve(row_kode, prov, kab, sources):
    key = (norm(prov), norm(kab))
    for by_kode, by_pair, by_name in sources:
        if row_kode in by_kode:
            return by_kode[row_kode]
        if key in by_pair:
            return by_pair[key]
        if len(by_name.get(key[1], [])) == 1:
            return by_name[key[1]][0]
    return None


def round_coords(obj, nd=3):
    if isinstance(obj, (int, float)):
        return round(obj, nd)
    return [round_coords(x, nd) for x in obj]


def main(mari_path, azun_path, csv_path):
    mari = json.load(open(mari_path))['features']
    azun = json.load(open(azun_path))['features']
    sources = [
        index_source(mari, 'KDPKAB', 'WADMKK', 'WADMPR', strip_dots=True),
        index_source(azun, 'CC_2', 'NAME_2', 'NAME_1'),
    ]

    rows = list(csv.DictReader(open(csv_path)))
    by_prov = defaultdict(list)
    prov_names = {}
    for row in rows:
        kode = row['Kode'].strip()
        prov, kab = row['Prov'].strip(), row['Kabkot'].strip()
        prov_names.setdefault(kode[:2], prov)
        ft = resolve(kode, prov, kab, sources)
        if ft is not None:
            try:
                g = shape(ft['geometry']).buffer(0)  # repair invalid rings
                if not g.is_empty:
                    by_prov[kode[:2]].append(g)
            except Exception as e:
                print(f'  skip {kode} {kab}: {e}')

    features = []
    for pk in sorted(by_prov):
        merged = unary_union(by_prov[pk]).simplify(0.008, preserve_topology=True)
        geom = mapping(merged)
        geom['coordinates'] = round_coords(geom['coordinates'])
        features.append({
            'type': 'Feature',
            'properties': {'kode': pk, 'nama': prov_names[pk]},
            'geometry': geom,
        })
        print(f'prov-{pk} {prov_names[pk]}: {len(by_prov[pk])} kab merged')

    fc = {'type': 'FeatureCollection', 'features': features}
    OUT.write_text(json.dumps(fc, separators=(',', ':')))
    print(f'\n{len(features)} provinces -> {OUT.name} ({OUT.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:4])

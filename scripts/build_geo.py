#!/usr/bin/env python3
"""Build per-province kabupaten/kota GeoJSON files for the choropleth map.

Sources (real administrative boundaries, community extracts):
  1. marifauzan/geojson-kabupaten-kota-indonesia (BIG TASWIL 2022, 38 provinces)
     https://raw.githubusercontent.com/marifauzan/geojson-kabupaten-kota-indonesia/main/38_Provinsi_Indonesia_Kabupaten.json
  2. azunzios/indonesia-geojson (GADM simplified, has BPS code CC_2)
     https://raw.githubusercontent.com/azunzios/indonesia-geojson/main/indonesia_kabkota_simple.geojson

Join key: BPS "Kode" from the app's "Akses Kabkot" sheet (4-digit).
Matching order per sheet row: kode (source 1) -> prov+name (1) -> unique
name (1) -> kode (2) -> prov+name (2) -> unique name (2).

Output: public/geo/prov-<2-digit>.json, one FeatureCollection per province,
properties {kode, nama}, coordinates rounded to 4 decimals.

Usage:
  python3 scripts/build_geo.py <marifauzan.json> <azunzios.geojson> <kabkot.csv>
"""
import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent.parent / 'public' / 'geo'


def norm(s):
    """Normalize an area name. Keeps 'kota' (distinguishes Kota Sorong from
    Kab. Sorong), drops kabupaten/adm markers and non-letters."""
    s = (s or '').lower()
    s = re.sub(r'\b(kabupaten|kab\.?|adm\.?|administrasi)\b', '', s)
    s = re.sub(r'[^a-z]', '', s)
    return s


def round_coords(coords, nd=4):
    if isinstance(coords[0], (int, float)):
        return [round(coords[0], nd), round(coords[1], nd)]
    out = []
    prev = None
    for c in coords:
        r = round_coords(c, nd)
        if isinstance(r[0], (int, float)) and r == prev:
            continue  # drop consecutive duplicates after rounding
        prev = r if isinstance(r[0], (int, float)) else None
        out.append(r)
    return out


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
    return by_kode, by_pair, by_name, name_key, prov_key


def resolve(row_kode, prov, kab, sources):
    """Guarded matching: a kode hit counts only if the feature's own
    province or kab name agrees — kemendagri vs BPS numbering collides in
    the 9xxx (Papua) range, so bare kode equality is not trustworthy."""
    key = (norm(prov), norm(kab))
    for by_kode, by_pair, by_name, name_key, prov_key in sources:
        ft = by_kode.get(row_kode)
        if ft is not None:
            p = ft['properties']
            if norm(p.get(prov_key)) == key[0] or norm(p.get(name_key)) == key[1]:
                return ft
            # kode collision across coding systems: reject, fall through
        if key in by_pair:
            return by_pair[key]
        if len(by_name.get(key[1], [])) == 1:
            return by_name[key[1]][0]
    return None


def main(mari_path, azun_path, csv_path):
    mari = json.load(open(mari_path))['features']
    azun = json.load(open(azun_path))['features']
    sources = [
        index_source(mari, 'KDPKAB', 'WADMKK', 'WADMPR', strip_dots=True),
        index_source(azun, 'CC_2', 'NAME_2', 'NAME_1'),
    ]

    rows = list(csv.DictReader(open(csv_path)))
    by_prov = defaultdict(list)
    missing = []
    for row in rows:
        kode = row['Kode'].strip()
        prov, kab = row['Prov'].strip(), row['Kabkot'].strip()
        ft = resolve(kode, prov, kab, sources)
        if ft is None:
            missing.append((kode, prov, kab))
            continue
        by_prov[kode[:2]].append({
            'type': 'Feature',
            'properties': {'kode': kode, 'nama': kab},
            'geometry': {
                'type': ft['geometry']['type'],
                'coordinates': round_coords(ft['geometry']['coordinates']),
            },
        })

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    total = 0
    for prov_kode, feats in sorted(by_prov.items()):
        fc = {'type': 'FeatureCollection', 'prov': prov_kode, 'features': feats}
        out = OUT_DIR / f'prov-{prov_kode}.json'
        out.write_text(json.dumps(fc, separators=(',', ':')))
        total += out.stat().st_size
        print(f'{out.name}: {len(feats)} features, {out.stat().st_size // 1024} KB')

    print(f'\nTotal: {sum(len(f) for f in by_prov.values())}/{len(rows)} kab/kota, '
          f'{total // 1024} KB across {len(by_prov)} files')
    if missing:
        print('WITHOUT geometry (map will show them in the ranked-list fallback):')
        for m in missing:
            print(' ', m)


if __name__ == '__main__':
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:4])

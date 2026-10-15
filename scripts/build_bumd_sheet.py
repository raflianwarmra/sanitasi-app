#!/usr/bin/env python3
"""Build the clean "BUMD Air Minum" Google Sheet tab from the Bappenas workbook.

Input:  "Data Kinerja BUMD AM <tahun> (TB <tahun-1>)" workbook (one sheet,
        title rows above a header row that contains "Nama BUMD Air Minum").
Output: an .xlsx with ONE tab, header in row 1, raw (unformatted) numbers and
        a "Kode BPS" join key, ready for File -> Import -> Insert new sheet.

Kode BPS is resolved from public/geo/prov-*.json (the same 514 kab/kota codes
the dashboard uses) by normalized name + type (Kabupaten vs Kota). Names that
differ between sources are listed in ALIASES. A BUMD that serves several
kab/kota (e.g. PAM Jaya for all of DKI Jakarta) carries several codes joined
with ";". The script refuses to write output if any row is unmatched or its
kode prefix disagrees with its province.

Usage:
  python3 scripts/build_bumd_sheet.py <bappenas.xlsx> <out.xlsx> [tahun_buku]
"""
import collections
import glob
import json
import re
import sys
from pathlib import Path

import openpyxl
from openpyxl.styles import Font, PatternFill

ROOT = Path(__file__).resolve().parent.parent

# Workbook name (lowercased, trimmed) -> kode BPS. Only for names that do not
# match the dashboard geometry names after normalization.
ALIASES = {
    'kota padang sidempuan': '1277',                  # Padangsidimpuan
    'dki jakarta': '3101;3171;3172;3173;3174;3175',   # PAM Jaya, tingkat provinsi
    'kabupaten mempawah': '6104',                     # dulu Kab. Pontianak
    'kabupaten paser': '6401',                        # Pasir
    'kabupaten tana tidung': '6504',                  # Tanah Tidung
    'kabupaten kepulauan siau tagulandang biaro': '7108',
    'kabupatan morowali': '7203',                     # typo di sumber
    'kabupaten pangkajene kepulauan': '7309',         # Pangkajene dan Kepulauan
    'kabupaten kepulauan tanimbar': '8101',           # dulu Maluku Tenggara Barat
    'kabupaten kepulauan morotai': '8207',            # Pulau Morotai
}
NAME_FIXES = {'Kabupatan Morowali': 'Kabupaten Morowali'}

# (output header, source header, kind). kind: text | int | num | pct (ratio -> %)
COLUMNS = [
    ('Nama BUMD', 'nama bumd air minum', 'text'),
    ('Nilai Kinerja', 'nilai tahun buku', 'num'),
    ('Status Kinerja', 'kinerja tahun buku', 'status'),
    ('FCR/Non FCR', 'fcr/non fcr', 'text'),
    ('Tarif Rata-rata (Rp/m3)', 'tarif rata-rata (rp/m3)', 'int'),
    ('HPP (Rp/m3)', 'hpp nrw rill', 'int'),
    ('Pelanggan Aktif (SR)', 'jumlah pelanggan aktif tahun ini (sr)', 'int'),
    ('Pelanggan Total (SR)', 'jumlah pelanggan aktif dan non aktif (sr)', 'int'),
    ('Penduduk Terlayani (jiwa)', 'jumlah penduduk yang terlayani', 'int'),
    ('Penduduk Wilayah Pelayanan (jiwa)', 'jumlah penduduk dalam wilayah kerja pdam', 'int'),
    ('Cakupan Pelayanan Teknis (%)', 'cakupan pelayanan teknis', 'pct'),
    ('Pendapatan Operasi (Rp)', 'pendapatan operasi', 'int'),
    ('Biaya Operasi (Rp)', 'biaya operasi', 'int'),
    ('Laba Bersih Setelah Pajak (Rp)', 'laba bersih setelah pajak', 'int'),
    ('Tagihan Rekening Air (Rp)', 'jumlah rek air', 'int'),
    ('Penerimaan Rekening Air (Rp)', 'jumlah penerimaan rek air', 'int'),
    ('Efektivitas Penagihan (%)', 'efektivitas penagihan', 'pct'),
    ('Tingkat Kehilangan Air (%)', 'tingkat kehilangan air', 'pct'),
]
STATUS = {'SEHAT': 'Sehat', 'KURANG SEHAT': 'Kurang Sehat', 'SAKIT': 'Sakit'}


def norm(s):
    s = re.sub(r'[^a-z0-9 ]', ' ', str(s).lower())
    s = re.sub(r'\s+', ' ', s).strip()
    return re.sub(r'^(kabupaten|kab|kota)\s+', '', s).replace(' ', '')


def load_geo():
    index = collections.defaultdict(list)
    for f in glob.glob(str(ROOT / 'public/geo/prov-*.json')):
        data = json.load(open(f, encoding='utf-8'))
        for ft in data['features'] if 'features' in data else data:
            p = ft['properties']
            typ = 'kota' if int(p['kode'][2:]) >= 71 else 'kab'
            index[(norm(p['nama']), typ)].append(p['kode'])
    return index


def main(src, out, tahun_buku):
    ws = openpyxl.load_workbook(src, read_only=True, data_only=True).worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    hdr_i = next(i for i, r in enumerate(rows) if any(str(c).strip().lower() == 'nama bumd air minum' for c in r if c))
    headers = [str(c).strip().lower() if c is not None else '' for c in rows[hdr_i]]

    def col(name):  # first column whose header starts with `name`
        for i, h in enumerate(headers):
            if h.startswith(name):
                return i
        raise SystemExit(f'Kolom tidak ditemukan: {name!r}')

    c_prov, c_kab = col('provinsi'), col('kabupaten / kota')
    src_cols = [(out_h, col(src_h), kind) for out_h, src_h, kind in COLUMNS]
    geo = load_geo()

    records, problems = [], []
    prov_prefixes = collections.defaultdict(set)
    for r in rows[hdr_i + 1:]:
        if not r[c_kab]:
            continue
        prov = re.sub(r'^provinsi\s+', '', str(r[c_prov]).strip(), flags=re.I)
        kab = NAME_FIXES.get(str(r[c_kab]).strip(), str(r[c_kab]).strip())
        raw = str(r[c_kab]).strip().lower()
        kode = ALIASES.get(raw)
        if not kode:
            typ = 'kota' if raw.startswith('kota ') else 'kab'
            hits = geo.get((norm(kab), typ), [])
            kode = hits[0] if len(hits) == 1 else None
        if not kode:
            problems.append(f'Tidak cocok: {prov} / {kab}')
            continue
        prov_prefixes[prov].update(k[:2] for k in kode.split(';'))
        rec = {'Kode BPS': kode, 'Provinsi': prov, 'Kabupaten/Kota': kab,
               'Lingkup': 'Provinsi' if ';' in kode else 'Kabupaten/Kota',
               'Tahun Buku': tahun_buku}
        for out_h, i, kind in src_cols:
            v = r[i]
            if kind == 'text':
                v = str(v).strip() if v is not None else ''
            elif kind == 'status':
                v = STATUS.get(str(v).strip().upper(), str(v).strip())
            elif v is None or v == '':
                v = None
            elif kind == 'int':
                v = int(round(float(v)))
            elif kind == 'num':
                v = round(float(v), 3)
            elif kind == 'pct':
                v = round(float(v) * 100, 2)
            rec[out_h] = v
        records.append(rec)

    for prov, pre in prov_prefixes.items():
        if len(pre) != 1:
            problems.append(f'Kode lintas provinsi untuk {prov}: {sorted(pre)}')
    used = collections.Counter(k for rec in records for k in rec['Kode BPS'].split(';'))
    problems += [f'Kode ganda: {k}' for k, n in used.items() if n > 1]
    if problems:
        raise SystemExit('\n'.join(problems))

    order = ['Kode BPS', 'Provinsi', 'Kabupaten/Kota', 'Lingkup', 'Tahun Buku'] + [c[0] for c in COLUMNS]
    wb = openpyxl.Workbook()
    sh = wb.active
    sh.title = 'BUMD Air Minum'
    sh.append(order)
    for c in sh[1]:
        c.font = Font(bold=True)
        c.fill = PatternFill('solid', fgColor='E8EEF4')
    for rec in sorted(records, key=lambda x: x['Kode BPS']):
        sh.append([rec[h] for h in order])
    for row in sh.iter_rows(min_row=2, max_col=1):
        row[0].number_format = '@'  # keep Kode BPS as text
    sh.freeze_panes = 'A2'
    for i, h in enumerate(order, start=1):
        sh.column_dimensions[openpyxl.utils.get_column_letter(i)].width = max(12, min(44, len(h) + 2))
    wb.save(out)
    print(f'{len(records)} baris, {len(used)} kab/kota tercakup -> {out}')


if __name__ == '__main__':
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 2023)

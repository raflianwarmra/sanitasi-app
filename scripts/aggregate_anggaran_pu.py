#!/usr/bin/env python3
"""Shrink the SIPD APBD/RKPD 2026 (bidang PU) workbooks to a small summary.

Run once on the machine that has the raw files (no pip install needed;
Python 3.8+ standard library only):

    python3 scripts/aggregate_anggaran_pu.py "docs/anggaran daerah"

It streams every .xlsx in the folder (the 134 MB APBD file included) and
writes, next to them:

    anggaran_pu_ringkas.csv   one row per file × pemda × program × amount
                              column: the summed Rupiah and the row count
    anggaran_pu_skema.txt     headers + sample rows of every sheet, so the
                              mapping can be checked without the raw file

Upload those two small files to the same Drive folder. The dashboard maps
programs to sectors (1.03.10 Jalan, 1.03.05 ALD, 1.03.03 Air Minum,
1.03.04 Persampahan, the rest Lainnya PU) and kode_ddn to Kode BPS.
"""
import csv
import os
import re
import sys
import time
import zipfile
import xml.etree.ElementTree as ET

NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
RNS = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'

CODE_COLS = ['kode_ddn', 'kode_pemda', 'kd_pemda', 'kode_daerah', 'kode_wilayah']
NAME_COLS = ['nama_pemda', 'nama_daerah', 'pemda', 'nama_wilayah']
PROG_CODE_COLS = ['kode_program', 'kd_program']
PROG_NAME_COLS = ['nama_program', 'program']
DETAIL_CODE_COLS = ['kode_sub_giat', 'kode_sub_kegiatan', 'kd_sub_giat', 'kode_giat', 'kode_kegiatan']
AMOUNT_WORDS = ('pagu', 'nilai', 'anggaran', 'realisasi', 'jumlah', 'total', 'rincian')
NOT_AMOUNT = ('kode', 'kd_', 'nama', 'target', 'satuan', 'tolak', 'tolok', 'capaian', 'teks', 'lokasi', 'dana', 'tahun')


def col_index(ref):
    n = 0
    for ch in ref:
        if ch.isalpha():
            n = n * 26 + (ord(ch.upper()) - 64)
        else:
            break
    return n - 1


def load_shared_strings(zf):
    if 'xl/sharedStrings.xml' not in zf.namelist():
        return []
    out = []
    with zf.open('xl/sharedStrings.xml') as fh:
        for ev, el in ET.iterparse(fh, events=('end',)):
            if el.tag == NS + 'si':
                out.append(''.join(t.text or '' for t in el.iter(NS + 't')))
                el.clear()
    return out


def sheet_targets(zf):
    wb = ET.fromstring(zf.read('xl/workbook.xml'))
    rels = ET.fromstring(zf.read('xl/_rels/workbook.xml.rels'))
    rmap = {r.get('Id'): r.get('Target') for r in rels}
    for s in wb.iter(NS + 'sheet'):
        target = rmap[s.get(RNS + 'id')].lstrip('/')
        if not target.startswith('xl/'):
            target = 'xl/' + target
        yield s.get('name'), target


def iter_rows(zf, path, shared):
    with zf.open(path) as fh:
        for ev, el in ET.iterparse(fh, events=('end',)):
            if el.tag != NS + 'row':
                continue
            row = {}
            for c in el.iter(NS + 'c'):
                t = c.get('t')
                if t == 'inlineStr':
                    val = ''.join(x.text or '' for x in c.iter(NS + 't'))
                else:
                    v = c.find(NS + 'v')
                    val = v.text if v is not None else None
                    if val is not None and t == 's':
                        val = shared[int(val)]
                if val is not None:
                    row[col_index(c.get('r'))] = val
            el.clear()
            if row:
                width = max(row) + 1
                yield [row.get(i) for i in range(width)]


def to_amount(v):
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    try:
        return round(float(s))
    except ValueError:
        pass
    s = re.sub(r'[^0-9,.\-]', '', s)
    if not s:
        return None
    # A lone separator before exactly three digits groups thousands
    # ("Rp 1.000"); Rupiah amounts never carry three decimals.
    if re.fullmatch(r'-?\d{1,3}[.,]\d{3}', s):
        s = s.replace('.', '').replace(',', '')
    elif s.count(',') > 1 or (',' in s and '.' in s and s.rfind('.') > s.rfind(',')):
        s = s.replace(',', '')
    elif s.count('.') > 1 or ('.' in s and ',' in s):
        s = s.replace('.', '').replace(',', '.')
    try:
        return round(float(s))
    except ValueError:
        return None


def first(headers, names):
    for n in names:
        if n in headers:
            return headers.index(n)
    return None


def program_code(code):
    # 1.03.05.2.01.0022 -> 1.03.05
    parts = (code or '').strip().split('.')
    return '.'.join(parts[:3]) if len(parts) >= 3 else (code or '').strip()


def process(path, writer_rows, schema):
    fname = os.path.basename(path)
    zf = zipfile.ZipFile(path)
    print(f'[{fname}] membaca shared strings…', flush=True)
    shared = load_shared_strings(zf)
    for sheet, target in sheet_targets(zf):
        rows = iter_rows(zf, target, shared)
        header, header_at, preview = None, 0, []
        for i, r in enumerate(rows):
            preview.append(r)
            norm = [str(x or '').strip().lower().replace(' ', '_') for x in r]
            if first(norm, CODE_COLS) is not None:
                header, header_at = norm, i
                break
            if i > 25:
                break
        schema.append(f'\n=== {fname} :: {sheet} ===')
        if header is None:
            schema.append('  (tidak ada kolom kode pemda; dilewati)')
            for r in preview[:6]:
                schema.append('  ' + ' | '.join(str(x) for x in r[:20]))
            continue
        schema.append('  header (baris %d): %s' % (header_at + 1, ' | '.join(header)))
        ci = first(header, CODE_COLS)
        ni = first(header, NAME_COLS)
        pi = first(header, ['provinsi', 'nama_provinsi'])
        pci = first(header, PROG_CODE_COLS)
        pni = first(header, PROG_NAME_COLS)
        di = first(header, DETAIL_CODE_COLS)
        bi = first(header, ['kode_bidang_urusan', 'kd_bidang_urusan'])
        amount_cols = [i for i, h in enumerate(header)
                       if any(w in h for w in AMOUNT_WORDS) and not any(b in h for b in NOT_AMOUNT)]
        schema.append('  kolom nilai: ' + ', '.join(header[i] for i in amount_cols))
        agg, names, nrows, samples, no_prog = {}, {}, 0, 0, 0
        bidang_seen = {}
        t0 = time.time()
        for r in rows:
            nrows += 1
            get = lambda i: (r[i] if i is not None and i < len(r) else None)
            if samples < 6:
                schema.append('  contoh: ' + ' | '.join(str(x) for x in r[:len(header)]))
                samples += 1
            kode = str(get(ci) or '').strip()
            if not kode:
                continue
            if kode.endswith('.0'):
                kode = kode[:-2]
            prog = str(get(pci) or '').strip() or program_code(get(di))
            if not prog:
                no_prog += 1
            pname = str(get(pni) or '').strip()
            b = str(get(bi) or '').strip()
            bidang_seen[b] = bidang_seen.get(b, 0) + 1
            names.setdefault(kode, (str(get(ni) or '').strip(), str(get(pi) or '').strip()))
            for ai in amount_cols:
                amt = to_amount(get(ai))
                if amt is None:
                    continue
                key = (kode, prog, header[ai])
                cur = agg.get(key)
                if cur is None:
                    agg[key] = [amt, 1, pname]
                else:
                    cur[0] += amt
                    cur[1] += 1
                    if not cur[2] and pname:
                        cur[2] = pname
            if nrows % 200000 == 0:
                print(f'  {sheet}: {nrows:,} baris ({time.time() - t0:.0f}s)', flush=True)
        schema.append(f'  total baris data: {nrows:,}; pemda: {len(names)}; baris tanpa kode program: {no_prog}')
        schema.append('  kode_bidang_urusan: ' + ', '.join(f'{k or "-"}={v}' for k, v in sorted(bidang_seen.items())))
        print(f'[{fname}] {sheet}: {nrows:,} baris, {len(names)} pemda', flush=True)
        for (kode, prog, col), (amt, n, pname) in sorted(agg.items()):
            nama, prov = names[kode]
            writer_rows.append([fname, sheet, kode, nama, prov, prog, pname, col, amt, n])


def main():
    folder = sys.argv[1] if len(sys.argv) > 1 else '.'
    files = sorted(f for f in os.listdir(folder) if f.lower().endswith('.xlsx') and not f.startswith('~$'))
    if not files:
        sys.exit(f'Tidak ada .xlsx di {folder}')
    rows, schema = [], []
    for f in files:
        process(os.path.join(folder, f), rows, schema)
    out_csv = os.path.join(folder, 'anggaran_pu_ringkas.csv')
    with open(out_csv, 'w', newline='', encoding='utf-8') as fh:
        w = csv.writer(fh)
        w.writerow(['file', 'sheet', 'kode_ddn', 'nama_pemda', 'provinsi', 'kode_program', 'nama_program', 'kolom_nilai', 'nilai_rp', 'jumlah_baris'])
        w.writerows(rows)
    out_txt = os.path.join(folder, 'anggaran_pu_skema.txt')
    with open(out_txt, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(schema) + '\n')
    print(f'\nSelesai: {out_csv} ({len(rows):,} baris)\n         {out_txt}')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Build the "Anggaran PU" and "Anggaran ALD Rinci" Google Sheet tabs from the
SIPD 2026 extracts (bidang PU & Penataan Ruang, urusan 1.03).

Input folder (never committed; see .gitignore):
  apbd_2026_pu.xlsx  sheet view_apbd_2026_pu, one row per rincian belanja
                     (akun level). Pemda by name only; no kode, no tahap
                     (murni/perubahan is not stated in the extract).
  rkpd_2026_pu.xlsx  sheet view_rkpd_2026_PU, one row per sub-kegiatan. Used
                     only for the sub-kegiatan output indicator and target.

Output: one .xlsx with two tabs, header in row 1, raw Rupiah, Kode BPS kept as
text, ready for File -> Import -> Insert new sheet(s).

  Anggaran PU          one row per pemda with APBD rows: sector columns
                       (Jalan, ALD, Air Minum, Persampahan, Lainnya PU),
                       Total Sektor, Penunjang (program 1.03.01, kept apart),
                       Total PU.
  Anggaran ALD Rinci   one row per pemda x ALD sub-kegiatan (program 1.03.05)
                       with a nonzero APBD value: kelompok, SKPD, nilai,
                       belanja-type split, funding-source split, and the RKPD
                       output indicator/target for that sub-kegiatan.

Pemda names are matched to the dashboard's Kode BPS (public/geo) by province +
normalized name + type (Kab vs Kota), with ALIASES for renamed regions. The
script refuses to write output on any unmatched pemda, duplicate code,
unknown ALD sub-kegiatan, or totals that don't reconcile.

Usage (standard library for reading; openpyxl only to write the xlsx):
  python3 scripts/build_anggaran_sheet.py "docs/anggaran daerah" <out.xlsx>
"""
import collections
import glob
import json
import re
import sys
import zipfile
from pathlib import Path

import openpyxl
from openpyxl.styles import Font, PatternFill

sys.path.insert(0, str(Path(__file__).resolve().parent))
from aggregate_anggaran_pu import iter_rows, load_shared_strings, sheet_targets  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
TAHUN = 2026
SUMBER = 'APBD 2026 (SIPD)'

# Normalized SIPD name -> Kode BPS, only where the dashboard geometry differs.
ALIASES = {
    'bangkabelitung': '19',
    'mempawah': '6104',            # dulu Kab. Pontianak
    'paser': '6401',               # Pasir
    'tanatidung': '6504',          # Tanah Tidung
    'kepulauantanimbar': '8101',   # dulu Maluku Tenggara Barat
    'pasangkayu': '7605',          # dulu Mamuju Utara
    'pangkajenekepulauan': '7309',
    'kepsiautagulandangbiaro': '7108',
    'toba': '1206',                # dulu Toba Samosir
    'padangsidempuan': '1277',
}

SECTORS = [('1.03.10', 'Jalan'), ('1.03.05', 'ALD'), ('1.03.03', 'Air Minum'), ('1.03.04', 'Persampahan')]
PENUNJANG = '1.03.01'

# ALD sub-kegiatan -> kelompok, keyed by (level digit, last 4 digits) of
# kode_sub_giat 1.03.05.L.KK.SSSS (L=1 provinsi, L=2 kab/kota).
ALD_GROUPS = {
    'SPALD Terpusat': {
        '1': ['0012', '0013'],
        '2': ['0018', '0020', '0022', '0023', '0024', '0025', '0027', '0028', '0029',
              '0030', '0031', '0032', '0042'],
    },
    'SPALD Setempat': {'2': ['0044']},
    'IPLT & Lumpur Tinja': {'2': ['0019', '0021', '0033', '0036', '0037']},
    'Operasi & Pemeliharaan': {'1': ['0018'], '2': ['0038']},
    'Perencanaan & Pembinaan': {
        '1': ['0015', '0016', '0021', '0022', '0023'],
        '2': ['0026', '0034', '0040', '0043', '0045'],
    },
}
ALD_GROUP_OF = {(lv, s): g for g, by in ALD_GROUPS.items() for lv, ss in by.items() for s in ss}

BELANJA = [('Modal', lambda a: a.startswith('5.2')),
           ('Barang & Jasa', lambda a: a.startswith('5.1.02')),
           ('Hibah & Bansos', lambda a: a.startswith(('5.1.05', '5.1.06'))),
           ('Pegawai', lambda a: a.startswith('5.1.01'))]


def dana_family(nama):
    n = nama.lower()
    if n.startswith('dak '):
        return 'DAK'
    if n.startswith('dau') or 'dana alokasi umum' in n:
        return 'DAU'
    if 'bagi hasil' in n or n.startswith('dbh'):
        return 'Bagi Hasil'
    if (n.startswith(('pajak', 'retribusi', 'opsen', 'pbjt', 'bea balik', 'lain-lain pad', 'hasil pengelolaan'))
            or 'pendapatan asli daerah' in n or 'blud' in n):
        return 'PAD'
    return 'Lainnya'


DANA = ['DAK', 'DAU', 'PAD', 'Bagi Hasil', 'Lainnya']


def norm(s):
    s = re.sub(r'[^a-z0-9 ]', ' ', str(s).lower())
    s = re.sub(r'\s+', ' ', s).strip()
    return re.sub(r'^(provinsi|kabupaten|kab|kota)\s+', '', s).replace(' ', '')


def clean(s):
    return re.sub(r'\s+', ' ', str(s or '').replace('Â³', '³').replace('_x000D_', ' ')).strip()


def load_geo():
    provs = {norm(f['properties']['nama']): f['properties']['kode']
             for f in json.load(open(ROOT / 'public/geo/indonesia-provinces.json', encoding='utf-8'))['features']}
    kab = collections.defaultdict(list)
    for f in glob.glob(str(ROOT / 'public/geo/prov-*.json')):
        data = json.load(open(f, encoding='utf-8'))
        for ft in data['features'] if 'features' in data else data:
            p = ft['properties']
            typ = 'kota' if int(p['kode'][2:]) >= 71 else 'kab'
            kab[(p['kode'][:2], norm(p['nama']), typ)].append(p['kode'])
    return provs, kab


class Resolver:
    def __init__(self):
        self.provs, self.kab = load_geo()
        self.memo, self.problems = {}, []

    def __call__(self, prov, nama):
        key = (prov, nama)
        if key not in self.memo:
            self.memo[key] = self._resolve(prov, nama)
        return self.memo[key]

    def _resolve(self, prov, nama):
        pk = self.provs.get(norm(prov)) or ALIASES.get(norm(prov))
        if not pk:
            self.problems.append(f'Provinsi tidak cocok: {prov!r}')
            return None
        if nama.lower().startswith('provinsi'):
            if (self.provs.get(norm(nama)) or ALIASES.get(norm(nama))) != pk:
                self.problems.append(f'Nama pemprov tidak sesuai provinsi: {prov!r} / {nama!r}')
                return None
            return pk
        kode = ALIASES.get(norm(nama))
        if not kode:
            typ = 'kota' if nama.lower().startswith('kota ') else 'kab'
            hits = self.kab.get((pk, norm(nama), typ), [])
            kode = hits[0] if len(hits) == 1 else None
        if not kode:
            self.problems.append(f'Tidak cocok: {prov} / {nama}')
        elif kode[:2] != pk:
            self.problems.append(f'Kode {kode} di luar provinsi {prov} ({pk}): {nama}')
            return None
        return kode


def read_view(path, sheet_prefix):
    zf = zipfile.ZipFile(path)
    shared = load_shared_strings(zf)
    for name, target in sheet_targets(zf):
        if name.lower().startswith(sheet_prefix):
            rows = iter_rows(zf, target, shared)
            header = [str(h or '').strip().lower() for h in next(rows)]
            for r in rows:
                yield dict(zip(header, r + [None] * (len(header) - len(r))))
            return
    raise SystemExit(f'Sheet {sheet_prefix}* tidak ditemukan di {path}')


def num(v):
    return float(v) if v not in (None, '') else 0.0


def main(folder, out):
    folder = Path(folder)
    resolve = Resolver()

    # ── RKPD: output indicator + target per (Kode BPS, kode_sub_giat), ALD only
    targets, rkpd_codes = collections.defaultdict(list), collections.defaultdict(set)
    for r in read_view(folder / 'rkpd_2026_pu.xlsx', 'view_rkpd'):
        kode = resolve(clean(r['provinsi']), clean(r['nama_pemda']))
        if kode:
            rkpd_codes[kode].add(clean(r['kode_ddn']))
        if kode and clean(r['kode_program']) == '1.03.05':
            ind, tgt = clean(r['tolak_ukur_output']), clean(r['target_teks_output'])
            # skip placeholder indicators ('0', '-') that carry no words
            if re.search(r'[A-Za-z]', ind) and (ind, tgt) not in targets[(kode, clean(r['kode_sub_giat']))]:
                targets[(kode, clean(r['kode_sub_giat']))].append((ind, tgt))
    print(f'RKPD: {len(rkpd_codes)} pemda, {len(targets)} pasangan pemda x sub-kegiatan ALD', flush=True)

    # ── APBD: sector totals per pemda, ALD detail per pemda x sub-kegiatan
    pemda = {}                                   # kode -> {nama, prov, sectors...}
    names_of = collections.defaultdict(set)      # kode -> SIPD names (duplicate check)
    ald = {}                                     # (kode, kode_sub_giat) -> detail
    dropped, grand, n = 0.0, 0.0, 0
    for r in read_view(folder / 'apbd_2026_pu.xlsx', 'view_apbd'):
        n += 1
        if n % 100000 == 0:
            print(f'  APBD {n:,} baris…', flush=True)
        amt = num(r['total_harga'])
        grand += amt
        if clean(r['kode_bidang_urusan']) != '1.03':
            dropped += amt
            continue
        prov, nama = clean(r['provinsi']), clean(r['nama_daerah'])
        kode = resolve(prov, nama)
        if not kode:
            continue
        names_of[kode].add(nama)
        p = pemda.setdefault(kode, {'nama': nama, 'prov': prov, **{s: 0.0 for _, s in SECTORS},
                                    'Lainnya PU': 0.0, 'Penunjang': 0.0})
        prog = clean(r['kode_program'])
        sector = dict(SECTORS).get(prog) or ('Penunjang' if prog == PENUNJANG else 'Lainnya PU')
        p[sector] += amt
        if prog != '1.03.05':
            continue
        sub = clean(r['kode_sub_giat'])
        parts = sub.split('.')
        group = ALD_GROUP_OF.get((parts[3], parts[-1])) if len(parts) == 6 else None
        if not group:
            resolve.problems.append(f'Sub-kegiatan ALD belum dikelompokkan: {sub} {clean(r["nama_sub_giat"])}')
            continue
        d = ald.setdefault((kode, sub), {'nama': clean(r['nama_sub_giat']), 'group': group, 'skpd': collections.Counter(),
                                         'nilai': 0.0, 'belanja': collections.Counter(), 'dana': collections.Counter(),
                                         'dana_nama': collections.Counter()})
        d['nilai'] += amt
        d['skpd'][clean(r['nama_sub_skpd']) or clean(r['nama_skpd'])] += amt
        akun = clean(r['kode_akun'])
        bel = next((b for b, test in BELANJA if test(akun)), None)
        if bel is None:
            resolve.problems.append(f'Akun ALD di luar kelompok belanja: {akun} ({sub})')
            continue
        d['belanja'][bel] += amt
        dn = clean(r['nama_dana']) or 'Tidak tercantum'
        d['dana'][dana_family(dn)] += amt
        d['dana_nama'][dn] += amt
    print(f'APBD: {n:,} baris, {len(pemda)} pemda', flush=True)

    # ── Validation
    problems = list(dict.fromkeys(resolve.problems))
    problems += [f'Kode ganda {k}: {sorted(v)}' for k, v in names_of.items() if len(v) > 1]
    problems += [f'Kode DDN ganda untuk {k}: {sorted(v)}' for k, v in rkpd_codes.items() if len(v) > 1]
    sector_cols = [s for _, s in SECTORS] + ['Lainnya PU']
    pu_total = sum(p[s] for p in pemda.values() for s in sector_cols + ['Penunjang'])
    if abs(pu_total + dropped - grand) > 1:
        problems.append(f'Total tidak cocok: {pu_total:,.0f} + {dropped:,.0f} != {grand:,.0f}')
    ald_by_kode = collections.Counter()
    for (kode, _), d in ald.items():
        ald_by_kode[kode] += d['nilai']
        for split in ('belanja', 'dana'):
            if abs(sum(d[split].values()) - d['nilai']) > 1:
                problems.append(f'Rincian {split} tidak sama dengan nilai: {kode} {d["nama"]}')
    for kode, p in pemda.items():
        if abs(ald_by_kode[kode] - p['ALD']) > 1:
            problems.append(f'ALD {kode} {p["nama"]}: {p["ALD"]:,.0f} != rincian {ald_by_kode[kode]:,.0f}')
    if problems:
        raise SystemExit('\n'.join(problems))

    # ── Write
    wb = openpyxl.Workbook()
    pu = wb.active
    pu.title = 'Anggaran PU'
    pu_head = (['Kode BPS', 'Provinsi', 'Nama Pemda', 'Level', 'Tahun', 'Sumber']
               + [f'{s} (Rp)' for s in sector_cols] + ['Total Sektor (Rp)', 'Penunjang (Rp)', 'Total PU (Rp)'])
    pu.append(pu_head)
    for kode in sorted(pemda, key=lambda k: (k[:2], len(k), k)):
        p = pemda[kode]
        vals = [round(p[s]) for s in sector_cols]
        prov = re.sub(r'^provinsi\s+', '', p['prov'], flags=re.I)
        pu.append([kode, prov, p['nama'], 'Provinsi' if len(kode) == 2 else 'Kab/Kota', TAHUN, SUMBER]
                  + vals + [sum(vals), round(p['Penunjang']), sum(vals) + round(p['Penunjang'])])

    rinci = wb.create_sheet('Anggaran ALD Rinci')
    rinci_head = (['Kode BPS', 'Nama Pemda', 'Level', 'Kelompok', 'Kode Sub Kegiatan', 'Sub Kegiatan', 'SKPD',
                   'Nilai (Rp)'] + [f'{b} (Rp)' for b, _ in BELANJA] + [f'{d} (Rp)' for d in DANA]
                  + ['Sumber Dana', 'Indikator Keluaran (RKPD)', 'Target (RKPD)'])
    rinci.append(rinci_head)
    rows = 0
    for (kode, sub), d in sorted(ald.items(), key=lambda kv: (kv[0][0][:2], len(kv[0][0]), kv[0][0], -kv[1]['nilai'])):
        if round(d['nilai']) == 0:
            continue
        tg = targets.get((kode, sub), [])
        rinci.append([kode, pemda[kode]['nama'], 'Provinsi' if len(kode) == 2 else 'Kab/Kota', d['group'], sub,
                      d['nama'], '; '.join(s for s, _ in d['skpd'].most_common()), round(d['nilai'])]
                     + [round(d['belanja'][b]) for b, _ in BELANJA] + [round(d['dana'][x]) for x in DANA]
                     + ['; '.join(s for s, v in d['dana_nama'].most_common() if v > 0),
                        '; '.join(i for i, _ in tg), '; '.join(t for _, t in tg)])
        rows += 1

    for sh, head in ((pu, pu_head), (rinci, rinci_head)):
        for c in sh[1]:
            c.font = Font(bold=True)
            c.fill = PatternFill('solid', fgColor='E8EEF4')
        for row in sh.iter_rows(min_row=2, max_col=1):
            row[0].number_format = '@'  # keep Kode BPS as text
        sh.freeze_panes = 'A2'
        for i, h in enumerate(head, start=1):
            sh.column_dimensions[openpyxl.utils.get_column_letter(i)].width = max(12, min(44, len(h) + 2))
    wb.save(out)

    ald_total = sum(p['ALD'] for p in pemda.values())
    print(f'\nAnggaran PU: {len(pemda)} pemda ({sum(len(k) == 2 for k in pemda)} provinsi), '
          f'total PU Rp{pu_total:,.0f} (di luar urusan 1.03: Rp{dropped:,.0f})')
    print(f'Anggaran ALD Rinci: {rows} baris, ALD Rp{ald_total:,.0f}')
    print(f'-> {out}')


if __name__ == '__main__':
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])

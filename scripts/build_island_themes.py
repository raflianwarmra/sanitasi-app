#!/usr/bin/env python3
"""Generate the per-island ("pulau") theme tokens for src/index.css.

Each island gets a full chrome theme in light and dark: canvas, inset tiles,
control fills, hairlines, UI accent (text / filled / soft), hero wash and nav
material. Data colors (--viz-*, status, map ramps) are NOT touched — provinces
must stay comparable across islands.

Colors are designed in OKLCH (predictable lightness) and emitted as hex
(canvas/SVG-safe). Every text pair is checked against WCAG AA and the accent
lightness is walked down/up until it passes; the script fails loudly
otherwise.

Usage: python3 scripts/build_island_themes.py > /tmp/islands.css
"""
import math
import sys

# id: (hue, accent chroma, surface chroma scale, nuance)
ISLANDS = {
    'sumatera':   (78, 0.13, 1.0, 'songket emas'),
    'jawa':       (284, 0.13, 1.0, 'batik indigo'),
    'balinusra':  (42, 0.14, 1.0, 'tenun ikat terakota'),
    'kalimantan': (152, 0.12, 1.0, 'hijau hutan hujan'),
    'sulawesi':   (205, 0.11, 1.1, 'toska pesisir'),
    'maluku':     (22, 0.15, 1.0, 'merah rempah cengkih'),
    'papua':      (55, 0.09, 0.8, 'cokelat ukiran'),
}

INK_3_LIGHT, INK_3_DARK = '#636366', '#A1A1A6'
INK_2_DARK = '#D1D1D6'


def oklch_to_srgb(L, C, H):
    h = math.radians(H)
    a, b = C * math.cos(h), C * math.sin(h)
    l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s_ = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    lin = (4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
           -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
           -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_)
    return lin


def in_gamut(lin):
    return all(-1e-4 <= x <= 1 + 1e-4 for x in lin)


def hexof(L, C, H):
    # reduce chroma until in sRGB gamut
    while C > 0 and not in_gamut(oklch_to_srgb(L, C, H)):
        C -= 0.002
    lin = oklch_to_srgb(L, max(C, 0), H)
    out = []
    for x in lin:
        x = min(max(x, 0), 1)
        v = 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055
        out.append(round(v * 255))
    return '#%02X%02X%02X' % tuple(out)


def lum(hx):
    c = [int(hx[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def cr(a, b):
    x, y = sorted([lum(a), lum(b)], reverse=True)
    return (x + 0.05) / (y + 0.05)


def walk(make, ok, start, step, limit):
    """Move lightness from `start` by `step` until ok(hex) or limit."""
    L = start
    while (step < 0 and L >= limit) or (step > 0 and L <= limit):
        hx = make(L)
        if ok(hx):
            return hx
        L += step
    raise SystemExit(f'no passing lightness for {make}')


def light(H, Ca, k):
    t = {}
    t['--bg-base'] = hexof(0.968, 0.013 * k, H)
    t['--paper-2'] = hexof(0.962, 0.018 * k, H)
    t['--fill'] = hexof(0.930, 0.024 * k, H)
    t['--fill-2'] = hexof(0.895, 0.03 * k, H)
    t['--line'] = hexof(0.875, 0.022 * k, H)
    t['--line-2'] = hexof(0.925, 0.016 * k, H)
    t['--accent-soft'] = hexof(0.945, 0.04 * k, H)
    t['--accent'] = walk(lambda L: hexof(L, Ca, H),
                         lambda h: cr(h, '#FFFFFF') >= 5.0 and cr(h, t['--accent-soft']) >= 4.6 and cr(h, t['--fill']) >= 4.5,
                         0.56, -0.01, 0.30)
    t['--accent-strong'] = walk(lambda L: hexof(L, Ca * 0.95, H), lambda h: cr(h, t['--accent-soft']) >= 6.0, 0.48, -0.01, 0.25)
    t['--accent-fill'] = walk(lambda L: hexof(L, Ca * 1.05, H), lambda h: cr('#FFFFFF', h) >= 4.6, 0.58, -0.01, 0.30)
    t['--island-hero'] = hexof(0.925, 0.055 * k, H)
    t['--island-motif'] = hexof(0.62, Ca * 0.9, H)
    return t


def dark(H, Ca, k):
    t = {}
    t['--bg-base'] = hexof(0.135, 0.016 * k, H)
    t['--paper'] = hexof(0.2, 0.02 * k, H)
    t['--paper-2'] = hexof(0.245, 0.024 * k, H)
    t['--fill'] = hexof(0.245, 0.024 * k, H)
    t['--fill-2'] = hexof(0.30, 0.028 * k, H)
    t['--line'] = hexof(0.32, 0.024 * k, H)
    t['--line-2'] = hexof(0.255, 0.02 * k, H)
    t['--accent-soft'] = hexof(0.29, 0.06 * k, H)
    t['--accent'] = walk(lambda L: hexof(L, Ca * 0.95, H),
                         lambda h: cr(h, t['--paper-2']) >= 4.6 and cr(h, t['--accent-soft']) >= 4.6,
                         0.72, 0.01, 0.95)
    t['--accent-strong'] = walk(lambda L: hexof(L, Ca * 0.8, H), lambda h: cr(h, t['--accent-soft']) >= 6.0, 0.80, 0.01, 0.97)
    t['--accent-fill'] = walk(lambda L: hexof(L, Ca * 1.05, H), lambda h: cr('#FFFFFF', h) >= 4.6, 0.56, -0.01, 0.30)
    t['--island-hero'] = hexof(0.30, 0.075 * k, H)
    t['--island-motif'] = hexof(0.70, Ca * 0.9, H)
    return t


def check(name, t, mode):
    paper = t.get('--paper', '#FFFFFF')
    ink3 = INK_3_LIGHT if mode == 'light' else INK_3_DARK
    pairs = [('ink-3/bg', ink3, t['--bg-base']), ('ink-3/paper-2', ink3, t['--paper-2']),
             ('ink-3/hero', ink3, t['--island-hero']), ('accent-strong/hero', t['--accent-strong'], t['--island-hero']),
             ('ink-3/fill', ink3, t['--fill']), ('accent/paper', t['--accent'], paper),
             ('accent/soft', t['--accent'], t['--accent-soft']), ('white/fill-btn', '#FFFFFF', t['--accent-fill'])]
    bad = [(n, round(cr(a, b), 2)) for n, a, b in pairs if cr(a, b) < 4.5]
    if bad:
        raise SystemExit(f'{name} {mode} contrast failure: {bad}')
    return min(round(cr(a, b), 2) for _, a, b in pairs)


def rgba(hx, a):
    return f'rgba({int(hx[1:3], 16)}, {int(hx[3:5], 16)}, {int(hx[5:7], 16)}, {a})'


def main():
    out = ['/* ═══ Island ("pulau") themes — GENERATED by scripts/build_island_themes.py ═══',
           '   Chrome only: surfaces, UI accent, hairlines, hero wash. Data colors',
           '   (--viz-*, status, map ramps) are never remapped. */']
    report = []
    for iid, (H, Ca, k, nuance) in ISLANDS.items():
        lt, dk = light(H, Ca, k), dark(H, Ca, k)
        report.append(f'{iid:11s} light min {check(iid, lt, "light")}  dark min {check(iid, dk, "dark")}')
        out.append(f'\n/* {iid} — {nuance} */')
        out.append(f'html[data-island="{iid}"] {{')
        for kk, v in lt.items():
            out.append(f'  {kk}: {v};')
        out.append(f'  --material: {rgba(lt["--bg-base"], 0.78)};')
        out.append('}')
        out.append(f'html[data-theme="dark"][data-island="{iid}"] {{')
        for kk, v in dk.items():
            out.append(f'  {kk}: {v};')
        out.append(f'  --material: {rgba(dk["--bg-base"], 0.78)};')
        out.append('}')
    print('\n'.join(out))
    print('\n'.join(report), file=sys.stderr)


if __name__ == '__main__':
    main()

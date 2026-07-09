# Plan: Dropdown Fix, Island Theme Escalation, Ladder Chart

Status: **Draft — plan only, no implementation yet.** Covers the three issues
reported after the national/island-theming release, plus how `/impeccable
polish` and `/impeccable animate` get applied once building resumes.

## 1. Dropdown "breaks" when opened

**Root cause (confirmed):** `PageHeader.jsx`'s outer wrapper has
`overflow: hidden` so the island motif SVG stays contained within the header
band. `SearchableSelect`'s option list is `position: absolute` relative to a
wrapper that lives *inside* that same overflow-hidden box. CSS clips all
descendants regardless of nesting depth, so the moment the list extends past
the header's bottom edge it gets sliced off — exactly what the screenshot
shows (search box visible, options cut short).

**Fix:** stop clipping the whole header. Move the motif into its own
`position: absolute; inset: 0; overflow: hidden; pointer-events: none` layer
that sits as a **sibling** of the content column, not a parent of it. The
content column (kicker/title/controls/dropdown) then has no overflow
ancestor, so the dropdown's absolutely-positioned list renders in full.

**Files:** `src/components/PageHeader.jsx` only. No change needed to
`SearchableSelect.jsx` itself — the bug is purely in how its parent clips.

## 2. Island theme too subtle — escalate, prioritize "feel"

Confirmed: current treatment is a 6%-opacity wash + a 35%-opacity motif
corner, both close to invisible (visible in the Maluku Utara screenshot,
where the red accent barely reads against the default teal). The ask is
explicit: users should *notice* the switch immediately, function unchanged.

Still bound by the same rule as the original theming plan
(`02-design-change-island-theming.md`): **chrome only, never data** — chart
colors, the choropleth ramps, table styling, and alert semantics (ok/warn/bad)
stay exactly as they are, so cross-province comparison isn't compromised by
theming. Everything below is a chrome-intensity escalation within that
boundary, not a boundary change.

Concrete escalation, each additive:

1. **Header wash → real gradient, higher opacity.** Replace the flat 6% tint
   with a left-to-right gradient starting around 20–25% of the island accent,
   fading to the base paper color — visibly colored at a glance instead of a
   near-invisible tint.
2. **Persistent island strip under TopNav.** A solid 5–6px color bar in the
   island's accent, pinned directly beneath the navigation bar. This is the
   single highest-impact, lowest-risk addition: it stays visible regardless
   of scroll position, so "you're now looking at a different island" reads
   even after the user has scrolled past the header.
3. **Page background tint.** Not just the header — the whole page's
   `var(--bg)` shifts toward the island's `soft` tone for the duration of
   that province's view (set via a CSS variable override on the page root,
   e.g. `data-island="jawa"` driving a scoped `--bg` override), so the shift
   reads through the entire scroll, not just the top ~100px.
4. **Motif — bigger and bolder.** Increase from ~35% to ~50–55% opacity and
   widen the coverage area; still masked/faded so it never competes with
   text, but clearly present rather than barely legible.
5. **Kicker + breadcrumb "current page" text** adopt the island accent color
   (already partly done for the kicker; extending to breadcrumb) — small,
   cheap, and reinforces identity on every glance at the top of the page.

**Files:** `src/components/PageHeader.jsx`, `src/components/IslandMotif.jsx`,
`src/components/Breadcrumb.jsx`, `src/index.css` (new `--bg` override
mechanism keyed by `data-island`), `src/pages/Provinsi.jsx` /
`src/pages/KabKota.jsx` (set the `data-island` attribute on their root when a
province is selected).

## 3. Ladder chart — needs the new sheet structures inspected

You've added two more sheets: **"Ladder Provinsi"** and **"Ladder
Kabupaten/Kota"**, alongside the existing "Ladder Nasional" — meaning the
7-rung ladder (*Akses Aman Terpusat, Akses Aman Setempat, Layak Sendiri,
Layak Bersama, Belum Layak, BABS Tertutup, BABS Terbuka*) is intended at all
three levels (national, per-province, per-kab/kota), not just national.

**Status: not yet inspected.** Network access to fetch the sheets was
intermittently unavailable while drafting this plan — I have not yet
confirmed:
- Whether "Ladder Nasional" now carries the Terpusat/Setempat split (it did
  not on the last successful check), and whether "Ladder Provinsi" /
  "Ladder Kabupaten/Kota" carry the full 7 rows or the same 6.
- The exact column/row shape of the two new sheets (one row per province or
  one row per province+rung; wide-years-as-columns like the existing sheets,
  or a different layout).
- Whether "Ladder Provinsi" is joined by province `kode` or by name, and
  whether "Ladder Kabupaten/Kota" is joined by kab/kota `kode` (consistent
  with every other join in this app) or something else.

**Next step before building:** re-run the sheet inspection (tab list +
sample rows for both new sheets) once network access is stable, fold the
confirmed shape into a `normalizeLadderProvinsi()` / `normalizeLadderKabkot()`
pair in `src/lib/sheets.js` (mirroring the existing
`normalizeLadderNasional()`), and wire a ladder chart into the Provinsi page
(per-province) and Kab/Kota page (per-kab/kota), reusing the same stacked-bar
rendering already built for `NationalView.jsx`'s ladder chart — extracted into
a shared `<LadderChart rungs={...} />` component so national/province/kab-kota
all render identically instead of three copies.

**If a sheet turns out to still have only 6 rows (combined "Akses Aman", no
Terpusat/Setempat split) at any level:** I will render 6 rungs at that level
with labels matching your wording for the other five, and flag the gap
rather than fabricate a split — same rule as before.

## 4. `/impeccable polish` and `/impeccable animate` — how they apply here

Per the skill's own sequencing (`animate.md` hands off to `polish.md` for
the final pass), these apply **after** the three fixes above are functionally
correct, not before — `polish.md` is explicit that "polish is the last step,
not the first."

**Animate pass** (once fixes land):
- Island switch itself is the "hero moment" worth animating: the header
  wash, strip color, and page-background tint should crossfade (~200–250ms,
  `ease-out-quart`) rather than snap, so the transition itself reinforces
  "something changed" instead of just the end-state color being different.
- Dropdown open/close: verify it already has appropriate motion (currently
  instant show/hide) — bring to the product register's 150–250ms transition
  standard.
- Respect `prefers-reduced-motion` throughout (already enforced globally in
  `index.css`; verify the new island-transition CSS falls under that same
  media query rather than being added as a one-off).

**Polish pass** (last, once animate is verified at 60fps):
- Design-system alignment check: confirm the escalated wash/strip/motif use
  only tokens and the existing `ISLANDS` accent values — no new hard-coded
  colors introduced outside `lib/islandTheme.js`.
- Contrast check in both light and dark mode for the stronger wash (higher
  opacity risks failing text contrast under the kicker/title if not checked
  against the new background).
- Verify the persistent strip + wash don't regress the container-width /
  vertical-density fixes from the earlier revision (no new horizontal
  overflow, no layout shift on province switch).
- Full breakpoint pass (375 / 768 / 1280 / 1440) since the header is one of
  the most viewport-sensitive components in the app.

## 5. Sequencing

1. Fix §1 (dropdown clipping) — isolated, no dependencies, ship first.
2. Fix §2 (theme escalation) — isolated from §3, can ship alongside §1.
3. Re-inspect the two new ladder sheets, then build §3 (national + province +
   kab/kota ladder charts via a shared component).
4. Animate pass over all three.
5. Polish pass over all three, plus a full regression check of the density
   and PPTX work from the prior release.

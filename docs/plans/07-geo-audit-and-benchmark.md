# Plan 07: Full Geo Audit vs Reference Repo + Kab/Kota Benchmark Charts

Status: **Draft — awaiting go-ahead to build.** No code changes yet.

## 1. Systematic geometry audit vs rezkyyayang/maps

**Reference repo structure (inspected):** 34 files, one per pre-pemekaran
province (`91_papua.html`, `92_papuabarat.html` — no 93/94/95/96/97). Each
file lists its kab/kota as `<path title="NAME">` — **name only, no BPS
kode**. The repo itself has at least one visible label typo ("SELMAN").

**Conflict rule (per your answer): sheet name, repo position.**
- Display name / spelling always comes from the Google Sheet (source of
  truth for naming — avoids propagating the repo's own typos).
- **Province membership** (which province a kab/kota's shape belongs to) is
  taken from the **repo** wherever the repo covers that province — i.e. if
  the repo's `13_sumbar.html` lists "PASAMAN" but my current geometry has
  it in a different province file, the repo's placement wins.
- For the 6 modern Papua provinces (repo doesn't cover them at all): no
  repo data exists, so membership stays sheet/kode-driven, exactly as today
  — there is nothing for the repo to override there.

**Process:**
1. Scrape all 34 reference files → `{province_file: [kab_names...]}`.
2. Name-normalize (same normalizer already used in the build scripts) both
   the repo's list and my current per-province geometry's kab list.
3. Diff, per province: kab/kota present in repo's province X but currently
   assigned to my province Y → **reassignment**, not just a flag.
4. Where the repo has no confident single match (ambiguous name, or not
   found — accounting for repo typos), fall back to the current sheet/kode
   pipeline and log it as "repo silent, kept existing" rather than guessing.
5. Re-run `scripts/validate_geo.py` after reassignment; append a diff
   section to `docs/geo-validation.md` listing every changed kab/kota
   (before province → after province) for your review.
6. This is a one-time correction script (`scripts/audit_vs_reference.py`),
   not a permanent pipeline dependency — the reference repo isn't fetched
   on every build, only when re-auditing.

## 2. Kab/Kota benchmark charts (replaces the simpler "rank badge" idea)

On the Kab/Kota profile page, add **three comparison charts** — one each
for Akses Layak (termasuk Aman), Akses Aman, and BABS Terbuka — placed
right after the existing "Akses Sanitasi" KPI cards, above the ladder chart.

Each chart:
- Horizontal bar per kab/kota in the **same province**, sorted by value.
- The **selected kab/kota's bar visually highlighted** (accent fill +
  outline; others muted).
- Two reference lines overlaid: **provincial average** and **national
  average** for that metric — computed client-side from already-loaded data
  (`Akses Kabkot` for provincial avg across the province's rows, `Nasional`
  sheet's 2025 value for the national line — no new data source needed).
- Legend: this kab/kota · other kab/kota in province · rata-rata provinsi ·
  rata-rata nasional.
- Reuses the existing `ChartContainer`/`ChartLegend` pattern; new shared
  `BenchmarkChart` component (one instance × 3 metrics) so it isn't
  triplicated.
- Tall-province handling: same scroll-contained pattern already used for
  the per-kab bar chart previously on the Provinsi page (contained height,
  not unbounded page growth).

## 3. Sequencing

1. Scrape + diff + reassign geometry (§1), validate, produce the before/after
   diff report.
2. Regenerate all affected `prov-XX.json` files + national file.
3. Build `BenchmarkChart` + wire 3 instances into Kab/Kota page (§2).
4. Lint, build, spot-check a formerly-mismatched province + the new charts
   in both themes and at 375/768/1280/1440.

Ready to build on your go-ahead.

# PRODUCT.md — Sanitasi.id

register: product

## Product Purpose

Sanitasi.id is a public-sector analytics dashboard for monitoring Indonesia's
sanitation performance: access indicators (Layak, Aman, BABS), wastewater
infrastructure (IPAL, IPLT), and local governance/regulation readiness
(kelembagaan, cluster tata kelola), and the condition of the local drinking
water utility (BUMD Air Minum: kinerja, FCR, pelanggan, cakupan, pendapatan,
laba) across 38 provinces and 514 kabupaten/kota.

It is a working tool for program teams, not a marketing site. The data feeds
directly into government coordination meetings, RPJMN target tracking, and
field monitoring (catatan lapangan).

## Users

- Sanitation program analysts (national team, "Tim Sanitasi") preparing
  briefing material and tracking progress against 2026/2029 targets.
- Provincial/local government counterparts checking their own area's profile.
- Field monitors appending infrastructure notes (log catatan) from site visits.

Typical context: laptop in a bright office, frequently projected on a screen
in a working meeting. Mobile use happens in the field (checking an asset's
status, adding a note).

## Tone

Calm, precise, institutional. Bahasa Indonesia throughout the UI.
Public-policy vocabulary (capaian, target, akses aman, keberfungsian).
No marketing language, no decorative flourishes, no emoji.

## Anti-references

- Generic SaaS dashboard templates (gradient hero metrics, icon-card grids).
- "AI-generated" visual tells: purple/pink gradients, glassmorphism as
  decoration (translucency is allowed only for functional chrome — see
  DESIGN.md), side-stripe accent borders, emoji icons.
- Consumer data-viz playfulness. This must be credible in a government
  meeting (Bappenas / Kementerian PUPR audience).

## Strategic principles

1. Decision-oriented: every panel should answer a planning question
   (which areas lag, which assets fail, where are the gaps to target).
2. Data honesty: show missing data as missing (—), never fabricate.
3. Exportable: analysts must be able to take data out (CSV) and produce
   meeting-ready material (PPTX) without a backend.
4. Resilient: the app reads live Google Sheets; any tab can fail without
   crashing the page.
5. Honest vintage: every section names its source tab and year (e.g. BUMD =
   Tahun Buku 2023); no global "data year" badge implies otherwise.
6. Access gate is a soft gate, not security: the sheet is link-shared and the
   site is static. Only a SHA-256 hash of the code ships.

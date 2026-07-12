# Geo Validation Report

Sheet rows: 514 kab/kota across 38 provinces.

| Prov | File features | Sheet kabs | Missing | Foreign | Centroid outliers |
|---|---|---|---|---|---|
| 11 Aceh | 23 | 23 | 0 | 0 | 0 |
| 12 Sumatera Utara | 33 | 33 | 0 | 0 | 0 |
| 13 Sumatera Barat | 19 | 19 | 0 | 0 | 1 |
| 14 Riau | 12 | 12 | 0 | 0 | 0 |
| 15 Jambi | 11 | 11 | 0 | 0 | 0 |
| 16 Sumatera Selatan | 17 | 17 | 0 | 0 | 0 |
| 17 Bengkulu | 10 | 10 | 0 | 0 | 0 |
| 18 Lampung | 15 | 15 | 0 | 0 | 0 |
| 19 Kep. Bangka Belitung | 7 | 7 | 0 | 0 | 0 |
| 21 Kepulauan Riau | 7 | 7 | 0 | 0 | 0 |
| 31 DKI Jakarta | 6 | 6 | 0 | 0 | 0 |
| 32 Jawa Barat | 27 | 27 | 0 | 0 | 0 |
| 33 Jawa Tengah | 35 | 35 | 0 | 0 | 0 |
| 34 DI Yogyakarta | 5 | 5 | 0 | 0 | 0 |
| 35 Jawa Timur | 38 | 38 | 0 | 0 | 0 |
| 36 Banten | 8 | 8 | 0 | 0 | 0 |
| 51 Bali | 9 | 9 | 0 | 0 | 0 |
| 52 Nusa Tenggara Barat | 10 | 10 | 0 | 0 | 0 |
| 53 Nusa Tenggara Timur | 22 | 22 | 0 | 0 | 0 |
| 61 Kalimantan Barat | 14 | 14 | 0 | 0 | 0 |
| 62 Kalimantan Tengah | 14 | 14 | 0 | 0 | 0 |
| 63 Kalimantan Selatan | 13 | 13 | 0 | 0 | 0 |
| 64 Kalimantan Timur | 10 | 10 | 0 | 0 | 0 |
| 65 Kalimantan Utara | 5 | 5 | 0 | 0 | 0 |
| 71 Sulawesi Utara | 15 | 15 | 0 | 0 | 1 |
| 72 Sulawesi Tengah | 13 | 13 | 0 | 0 | 0 |
| 73 Sulawesi Selatan | 24 | 24 | 0 | 0 | 0 |
| 74 Sulawesi Tenggara | 17 | 17 | 0 | 0 | 0 |
| 75 Gorontalo | 6 | 6 | 0 | 0 | 0 |
| 76 Sulawesi Barat | 6 | 6 | 0 | 0 | 0 |
| 81 Maluku | 11 | 11 | 0 | 0 | 0 |
| 82 Maluku Utara | 10 | 10 | 0 | 0 | 0 |
| 91 Papua Barat | 7 | 7 | 0 | 0 | 0 |
| 92 Papua Barat Daya | 6 | 6 | 0 | 0 | 0 |
| 94 Papua | 9 | 9 | 0 | 0 | 0 |
| 95 Papua Selatan | 4 | 4 | 0 | 0 | 0 |
| 96 Papua Tengah | 8 | 8 | 0 | 0 | 0 |
| 97 Papua Pegunungan | 8 | 8 | 0 | 0 | 0 |

National file: 38 provinces (matches sheet prefixes).

## Problems

- prov-13.json: centroid outlier 1309 (Pasaman, 1.8deg)
- prov-71.json: centroid outlier 7104 (Kepulauan Talaud, 3.3deg)

## Outlier verification

Both flagged centroid outliers were provenance-checked against the source
features and confirmed as TRUE GEOGRAPHY, not misassignments:

- `1309 Pasaman`: name-verified match in Sumatera Barat from both sources
  (kemendagri numbering is offset — 13.08 vs BPS 1309 — which is exactly why
  bare kode matching is guarded); the province centroid is pulled south by
  Kepulauan Mentawai, making northern Pasaman read as distant.
- `7104 Kepulauan Talaud`: name- and kode-verified in Sulawesi Utara from
  both sources; the island chain genuinely lies ~3° north of the mainland.

**Verdict: PASSED.** 514/514 coverage, zero duplicates, zero foreign or
missing kode, national file matches all 38 province prefixes. The guarded
matcher corrected Papua Barat (prov-91) and Papua Barat Daya (prov-92),
which had shapes cross-assigned via kemendagri/BPS kode collisions.

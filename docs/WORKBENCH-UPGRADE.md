# Workbench upgrade
User authorized implementation and routine design decisions without further approval on 2026-10-15.

## Scope
Upgrade Contrast Lens, Plain Language Meter and Data Shaper; add Image Studio, Text Diff, QR Studio, JSON Studio, Time Bridge and Codec Lab. Keep Color Vision Lab behavior intact. Reuse the original 36-glyph contact sheet through CSS background positioning, without regenerating or editing the artwork.

## Design
Shared numbered input/output panels, generous previews, compact parameter controls and a full-width export bar, using the existing paper/ink palette and Color Vision Lab layout vocabulary. Responsive single-column layout below 900px. All interface copy and dynamic output support Chinese, English and German. Input stays in memory and is never persisted or sent over the network.

## Implementation order
1. Shared glyph, headings, workbench styles, catalog entries and localized metadata.
2. Enrich existing tools: contrast suggestions/report; text highlights/statistics/export; table transforms, pasted input and format exports.
3. Six new static tool routes with isolated browser controllers and bounded input.
4. Unit tests for risky transformations, browser workflows and responsive checks, docs, screenshots.
5. Full verify; commit and push to main; check Actions and deployed routes.

## Boundaries
Use qrcode for QR encoding and diff for bounded text comparison rather than implementing these algorithms. Lazy-load them. No server, accounts, telemetry, remote processing or automatic file retention. Image operations apply to one static frame, with preview/output pixel caps. Text diff has explicit size and time limits. CSV/TSV imports retain the existing file/cell guards. CSV export preserves cell values; spreadsheet programs may interpret formula-looking values, so offer explicit escaping.

## Verification
Local production-base verify passed: Astro 0 diagnostics; 15 unit files / 77 tests; 12 static routes; 59 Chromium tests, including all new tool workflows, three-locale mobile layouts and screenshots in both themes. Follow-up fixes cover first-click image/QR downloads, contrast preview wrapping, source-preserving table transforms and reversible text cleanup. Third-party notices ship in public/THIRD_PARTY_NOTICES.txt.

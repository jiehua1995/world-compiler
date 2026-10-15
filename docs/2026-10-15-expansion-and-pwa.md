# World Compiler: layout, 22 tools and offline installation

## Scope

This release follows the owner's request for direct implementation: retain Astro/GitHub Pages, Chinese/English/German, local processing and the existing palette/artwork. No accounts, backend or upload endpoint are introduced.

- Home: vision, real device-local clock, centered directory action, three principles. About/privacy/licensing move to `/about/`.
- Shell: larger brand, visible mobile navigation, language globe and selected flag, GitHub and MIT attribution, installation control.
- Workbenches: common control baselines, paired numbered panels and captions, responsive stacking, keyboard focus.
- Twelve additional tools: audio, palette, regex, URL, units, random tokens, text cleanup, M3U8, OCR, PDF pages, PDF text, images-to-PDF.
- PWA: base-aware manifest, 192/512 icons, generated static asset allowlist, no user data caching, no automatic reload of open work.

## Boundaries

M3U8 supports public CORS-enabled unencrypted MPEG-TS VOD only, with bounded segment count and memory; unsupported/encrypted/live streams are rejected. There is no login/DRM bypass and no pretend MP4 conversion. OCR requires explicit local-site engine/language downloads; recognition runs on-device. Audio exports PCM WAV, using browser-supported input codecs. PDF page copying may not preserve forms, bookmarks or signatures; originals are untouched.

## Implementation / integration map

The catalog combines original tools, utility tools, native tools and media tools. Static slug routing selects their existing Astro workbench family. Core parsers and calculations live alongside controllers; common language and download helpers are reused. Build copies PDF/OCR assets before Astro and generates the manifest/worker afterwards. GitHub Actions runs the complete verification pipeline before deployment.

## Verification

Unit tests cover parsers, byte and size boundaries, page selection, conversions, WAV structure, regex expansion, cryptographic output bounds and PWA privacy allowlisting. Browser tests cover all tool flows, real OCR and a second recognition offline, M3U8 transport bytes, PDF page/text exports, stale-file replacement, clock progression, alignment, responsive navigation, language changes and offline navigation. Screenshots are inspected at desktop/mobile sizes in light/dark themes. Actual OS installation on iOS/Android is outside local Chromium coverage.

## Local verification record (2026-10-15)

- `npm run verify`: Astro/TypeScript 0 errors/warnings/hints; 105 unit/configuration tests passed; 25 static pages built; 81 Chromium tests passed.
- All 25 routes checked at 390px in Chinese, English and German without horizontal overflow.
- OCR first recognition after an explicit asset download was verified offline; PNG/JPEG, PDF exports and MPEG-TS output were exercised locally.
- A Windows-specific keyboard test was corrected: ArrowDown commits the native select; Tab leaves it without reopening the OS popup with Enter. Application keyboard support remains native.
- Scoped review fixes cover URL editing during downloads, redirected playlist bases, cancelled OCR initialization and stale audio/palette exports after invalid replacement files.

## References

- [MDN: making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- [Tesseract.js local installation](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md)
- [PDF.js](https://mozilla.github.io/pdf.js/)
- [pdf-lib](https://pdf-lib.js.org/)

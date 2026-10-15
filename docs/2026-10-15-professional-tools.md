# Professional tool expansion

This release adds 21 independent routes to the 22 existing tools. Each route is a static Astro page with the same responsive local workbench and copy/download flow. The list lives in `src/data/pro-tools.ts`; calculations and browser work are in `src/features/pro-tools/`.

## New tools

| Tool | Capability | Deliberate boundary |
|---|---|---|
| Random Forge | Secure random passwords, memorable phrases, unique lottery draws, dice, placeholder prose, localized greetings | The small memorable-word set is for inspiration, not account credentials; use password mode for accounts. |
| Markdown Studio | Heading hierarchy, H1, relative-link checks, paragraph/reading-size summary and suggested TOC | Reports structure; it does not render or rewrite Markdown. |
| YAML / JSON Converter | YAML ↔ JSON parsing and serialization | Input is capped at 1 MB; duplicate YAML keys and malformed documents fail. |
| XML Studio | Parse and serialize well-formed XML | DTD and entity declarations are rejected. |
| CSS Studio | Browser CSSOM parsing, normalization and minification | Output follows the browser's CSS parser and supported syntax. |
| CSV / JSON Bridge | Quoted CSV ↔ arrays of JSON records | Duplicate headers and ragged rows fail; CSV formulas are escaped by default, with an explicit opt-out. |
| Color Converter | HEX/RGB input, calculated HSL and preview | Named colors, alpha channels, and modern color spaces are not accepted as input. |
| Gradient Studio | Two-color linear CSS gradient, angle, preview and CSS export | Linear gradients only. |
| Cron Planner | Five-field cron explanation and next five matches | UTC only; no named fields, seconds, or vendor extensions. |
| IPv4 Subnet Calculator | CIDR mask, network, broadcast and host range | IPv4 only; `/31` and `/32` are treated as point-to-point/single-address ranges. |
| Date Math | Strict ISO date validation, day offset, day-of-year and weekday | Date-only arithmetic in UTC; no locale-specific parsing or time-of-day math. |
| Hash Studio | Web Crypto SHA-1/256/384/512 for text or files | Files are limited to 64 MB; SHA-1 is provided for compatibility and is not recommended for security. |
| UUID Studio | UUID v4 generation and syntax/version/variant inspection | Validation covers UUID syntax and RFC variant/version fields, not ownership or uniqueness history. |
| HTML Entities | Encode five HTML-significant characters and decode common/numeric references | Decoder deliberately supports a small named-entity set. |
| SVG Optimizer | Reuse the Color Vision Lab sanitizer, normalize dimensions and export SVG | Input is capped at 5 MB / 50,000 elements; scripts, events, external references and non-SVG namespaces are removed. |
| Image Converter | Decode local images and export PNG/JPEG/WebP when the browser returns the requested MIME type | 30 MB / 16 MP; decoder support varies; animated formats use frame one; JPEG transparency becomes white. |
| Favicon Studio | Generate a text-mark SVG and HTML link snippet | Generates SVG, not legacy ICO bundles or raster size packs. |
| Image Metadata | Browser-readable MIME, bytes, dimensions and aspect ratio | No claim of full EXIF/XMP or camera metadata extraction. |
| Password Audit | Local character-class inventory and approximate character-pool entropy | Heuristic only: no breached-password lookup, dictionary analysis, or crack-time estimate. |
| Text Formatter | Unicode-aware slug, title/sentence case, whitespace trim and line de-duplication | Case rules use JavaScript Unicode locale operations; they are not a full editorial style guide. |
| Markdown Table Builder | CSV/TSV parsing, equal-width validation and pipe escaping | Generates a Markdown table; does not infer data types or execute formulas. |

## Privacy and resource limits

Text, images, and files remain in the current page's memory. The new tools make no content requests and do not persist input. Hashing, randomness, and image decoding use browser APIs. The CSV formula guard changes spreadsheet-looking values only during CSV export and is visible as a checked option. File and pixel limits are checked before decode or digest work where the browser API permits it.

Image conversion depends on codecs supplied by each browser. Requested output types are verified against the returned `Blob.type`; unsupported formats fail instead of receiving a misleading extension. The supported formats are therefore intentionally not described as universal.

## Verification

`tests/pro-tools/core.test.ts` covers random range boundaries, color conversion, YAML parsing, entity conversion, Unicode text cleanup, IPv4 CIDR boundaries, cron parsing/run times, password-estimate fields, and UUID validation. `tests/e2e/pro-tools.spec.ts` checks every new static route and exercises representative random, YAML/JSON, CSV, Markdown, CIDR, cron, hash, image, and SVG workflows.

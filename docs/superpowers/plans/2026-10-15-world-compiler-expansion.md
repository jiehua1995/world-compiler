# 世界编译局扩展 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the approved three-language World Compiler platform with a separate landing page and tool directory, severity-adjustable color-vision simulation, and three additional working local-first tools.

**Architecture:** Keep Astro static pages and typed TypeScript feature modules; extend the existing dictionary, catalog, worker, and test patterns. Deliver each tool as a pure, unit-tested feature plus an accessible Astro page/controller; preserve browser-only processing and GitHub Pages base-path support.

**Tech Stack:** Astro, TypeScript, Vitest, Playwright, Web Worker, existing dependencies only.

**Spec:** `docs/superpowers/specs/2026-10-15-world-compiler-expansion-design.md`

## Global Constraints

- “所有工具继续在浏览器本地处理输入，不要求账户，不上传用户内容。”
- “全站语言为简体中文、英文、德文。”
- “延续 Astro 静态输出、TypeScript 浏览器交互、Web Worker 处理像素、Vitest 与 Playwright 测试，不增加前端框架。”
- “GitHub Pages base path `/world-compiler` 下的页面、脚本、Worker 与下载流程都必须正常。”
- CSV/TSV files larger than 10,000,000 bytes are rejected before reading.
- Color-vision severity is a simulation setting, never a clinical severity label; the published Machado et al. matrices are interpolated between 10% anchors.
- All added controls and status/error copy must be keyboard accessible and available in zh-CN, en, and de.

## Review Focus

- Corrupt or unsupported image file: reject safely, retain an operable workbench, and do not upload it (Task 5 test).
- Severity boundary/interpolation and worker cancellation: 0% equals original, 100% uses the dichromacy anchor, stale work cannot redraw replaced/reset images (Tasks 4–5 tests).
- Invalid foreground/background hex or near-zero luminance: do not calculate a ratio until both colors validate; preserve the valid contrast thresholds (Task 6 tests).
- Empty, one-word, punctuation-only, and mixed-language text: do not show misleading scores; statistics follow the explicit analysis language (Task 7 tests).
- Quoted delimiters/newlines, unclosed quotes, and oversized files: preserve valid CSV semantics or reject with a localized error before download (Task 8 tests).

---

## File Map

- `src/i18n/types.ts`, `src/i18n/locale.ts`, `src/i18n/dictionaries.ts`: locale union, locale resolution, all interface copy.
- `src/components/LanguageControl.astro`, `src/scripts/preferences.ts`, `src/layouts/BaseLayout.astro`: native language select and persisted switching.
- `src/pages/index.astro`, new `src/pages/tools/index.astro`, `src/components/ToolCard.astro`, `src/components/SiteHeader.astro`, catalog styles/scripts: landing/catalog separation and compact cards.
- `src/features/color-vision/{types,matrices,simulate,simulation.worker,worker-client,controller}.ts`, color-vision Astro components/page: model, worker protocol, comparison and export state.
- New `src/features/contrast-lens/`, `src/features/plain-language/`, and `src/features/data-shape/`: pure calculations/parsing.
- New Astro routes and tool components under `src/pages/tools/` and `src/components/tools/`; each page mounts its own controller.
- `tests/i18n/`, `tests/color-vision/`, `tests/<tool>/`, and `tests/e2e/`: unit and browser coverage.
- `README.md`, `docs/DEVELOPMENT.md`: update product features, routes, privacy, and verification guidance after implementation.

## Task 1: Extend locale model and translation dictionaries

**Interfaces:** `Locale = 'zh-CN' | 'en' | 'de'`; `LocalizedText = Record<Locale, string>`; `resolveLocale(stored, languages)` returns one of those locales.

- [ ] Add failing locale tests for stored `de`, browser tags `de` / `de-DE`, `en-US`, zh fallback, and invalid stored values in `tests/i18n/locale.test.ts`; run `npm run test:unit -- tests/i18n/locale.test.ts` and confirm failures.
- [ ] Update `src/i18n/types.ts` and `src/i18n/locale.ts` so all supported tags resolve to the correct dictionary key and unknown tags fall back to `zh-CN`.
- [ ] Add German entries for every existing dictionary key in `src/i18n/dictionaries.ts`; keep the `Record<Locale, Dictionary>` compile-time completeness check.
- [ ] Run the locale unit tests and `npm run check`; expect all locale tests to pass and no Astro/TypeScript diagnostics.
- [ ] Commit as `feat: add German locale`.

## Task 2: Replace language buttons with persisted native select

**Consumes:** Task 1 locale union and dictionaries.
**Produces:** `LanguageControl.astro` exposes one labeled `<select data-locale-select>` with options `zh-CN`, `en`, `de`; preferences respond to its `change` event and persist to `world-compiler:locale`.

- [ ] Add preference tests proving the select reflects the stored locale, changing to German updates localized copy and `<html lang>`, and the selection persists after reinitialization; verify these fail first.
- [ ] Update `src/components/LanguageControl.astro` and `src/scripts/preferences.ts`; update `<html lang>`, title, description, data-copy and aria labels for all three locales.
- [ ] Add/adjust Playwright coverage in `tests/e2e/preferences.spec.ts` for keyboard-operable selection, German copy, and reload persistence.
- [ ] Run `npm run test:unit -- tests/i18n/locale.test.ts` and the focused preference browser test; expect select state and document language to match the selected locale.
- [ ] Commit as `feat: add accessible language selector`.

## Task 3: Split landing page and tool directory

**Consumes:** Task 1 translations and current `tools` catalog data.
**Produces:** `/` as mission/privacy/license landing page; `/tools/` as filterable catalog; header catalog link points to `/tools/` from every route.

- [ ] Add failing catalog/unit and Playwright tests for a card-free landing page, catalog at `/tools/`, working category/search filters, and tool cards linking to individual routes.
- [ ] Move the existing directory markup and `initializeCatalog` mount from `src/pages/index.astro` into new `src/pages/tools/index.astro`; make `src/pages/index.astro` render the intro, privacy commitments, MIT/copyright notice, and directory CTA.
- [ ] Update `src/components/SiteHeader.astro`, `src/components/ToolCard.astro`, `src/components/CatalogControls.astro`, `src/scripts/catalog.ts`, and relevant CSS for `/tools/`, localized labels, German search, and compact cards.
- [ ] Run the focused catalog and routing Playwright tests; verify no root catalog cards and every card opens the expected tool page.
- [ ] Commit as `feat: separate landing page and tool directory`.

## Task 4: Add published severity matrices to color-vision engine

**Interfaces:** `VisionAxis = 'protan' | 'deutan' | 'tritan'`; `simulationMatrix(axis: VisionAxis, severity: number): ColorMatrix`; `VisionMode = 'original' | VisionAxis | 'achromatopsia' | 'blue-cone-monochromacy'`; `transformPixels(source, mode, severity?)` defaults severity to 100 for compatibility.

- [ ] Add failing tests in `tests/color-vision/simulate.test.ts` for severity clamping, 0% identity, 100% matching existing dichromacy anchors, and midpoint interpolation between published 10% matrix anchors.
- [ ] Replace fixed-only matrix lookup in `src/features/color-vision/matrices.ts` with Machado et al. 2009 anchor matrices for protan/deutan/tritan and interpolation between adjacent anchors; keep achromatopsia and blue-cone monochromacy separate.
- [ ] Update `src/features/color-vision/types.ts` and `src/features/color-vision/simulate.ts` to accept the mode and optional severity without changing alpha handling or RGBA validation.
- [ ] Run `npm run test:unit -- tests/color-vision/simulate.test.ts`; expect endpoint, interpolation, and existing pixel tests to pass.
- [ ] Commit as `feat: model adjustable color vision severity`.

## Task 5: Wire color-vision controls, worker, comparison, and export

**Consumes:** Task 4 mode and `transformPixels` API.
**Produces:** one selected simulation mode, accessible 0–100% strength slider for the three axes, original/simulated comparison, and export of the selected mode and strength.

- [ ] Add failing controller/component/Playwright tests for selecting each axis, changing severity, an achromatopsia/blue-cone preset, worker cancellation on reset/replacement, and export using the active severity.
- [ ] Extend `src/features/color-vision/simulation.worker.ts` and `worker-client.ts` request/response protocol with severity; ensure cancellation/current-request checks still prevent stale canvases.
- [ ] Update `src/features/color-vision/controller.ts`, `src/components/tools/ColorVisionWorkbench.astro`, `ComparisonCard.astro`, `ExportPanel.astro`, `PreviewDialog.astro`, and `src/pages/tools/color-vision.astro` to render the selected comparison and localize model disclaimers in all three languages.
- [ ] Run color-vision unit tests and focused Playwright flows, including invalid-image recovery, reset during processing, and PNG/JPEG export.
- [ ] Commit as `feat: add severity control to color vision lab`.

## Task 6: Implement Contrast Lens

**Interfaces:** `parseHexColor(value: string): RGB | null`; `contrastRatio(foreground: RGB, background: RGB): number`; `evaluateContrast(foreground, background): { ratio: number; normalAA: boolean; normalAAA: boolean; largeAA: boolean; largeAAA: boolean }`.

Use WCAG thresholds: normal AA 4.5:1, normal AAA 7:1, large AA 3:1, large AAA 4.5:1.

- [ ] Add failing tests in `tests/contrast-lens/contrast.test.ts` for invalid hex, 3/6-digit hex parsing, black/white ratio 21, equal colors ratio 1, and AA/AAA thresholds.
- [ ] Implement the WCAG relative-luminance formula in `src/features/contrast-lens/contrast.ts`; use no dependency.
- [ ] Add `src/pages/tools/contrast-lens.astro` and a small controller/component with paired native color inputs, validated hex fields, live preview, ratio and threshold results, full tri-language labels, and a concise non-certification note.
- [ ] Add Playwright tests for valid edits, invalid hex recovery, and keyboard interaction; run unit and focused e2e tests.
- [ ] Commit as `feat: build contrast lens`.

## Task 7: Implement Plain Language Meter

**Interface:** `analyzePlainLanguage(text: string, locale: Locale): PlainLanguageResult`, returning character/word count, sentence count, average sentence length, long-sentence flags, and optional score for English/German only.

- [ ] Add failing tests in `tests/plain-language/analyze.test.ts` for empty/punctuation-only text, English and German Flesch formulas, Chinese character/sentence metrics, locale-specific tokenization, and no score for insufficient text.
- [ ] Implement language-specific sentence/word segmentation and approximate vowel-nucleus syllable counting in `src/features/plain-language/analyze.ts`; apply formulas and thresholds exactly as recorded in the approved spec and label scores as estimates.
- [ ] Add `src/pages/tools/plain-language.astro` and an accessible local text input, analysis-language selector defaulting to UI locale, live stats, long-sentence prompts, and tri-language disclaimer.
- [ ] Add Playwright coverage for all three analysis languages, short-text behavior, keyboard use, and ensuring analysis does not send input over the network.
- [ ] Run unit tests and focused browser tests; commit as `feat: build plain language meter`.

## Task 8: Implement local CSV/TSV Data Shaper

**Interfaces:** `parseDelimitedText(text: string, delimiter: ',' | '\t'): string[][]`; `cleanRows(rows: string[][]): string[][]`; `serializeCsv(rows: string[][]): string`; `MAX_FILE_BYTES = 10_000_000`.

- [ ] Add failing tests in `tests/data-shape/csv.test.ts` for quoted delimiters, doubled quotes, quoted newlines, CRLF, trailing empty cells, malformed unmatched quotes, trimming cells, removing fully blank rows, and round-trip CSV escaping.
- [ ] Implement the parser, cleaner, serializer, and size constant in `src/features/data-shape/csv.ts`; reject malformed CSV rather than silently shifting columns.
- [ ] Add `src/pages/tools/data-shape.astro` and local file input, CSV/TSV delimiter handling, validation before read, bounded preview, accessible cleaning controls, localized errors, and CSV Blob download. Keep imported data only in current page memory.
- [ ] Add Playwright tests for local import/preview/cleanup/download, malformed-file recovery, and >10,000,000-byte rejection before parsing.
- [ ] Run unit and focused e2e tests; commit as `feat: build local data shaper`.

## Task 9: Final documentation, regression coverage, and full verification

- [ ] Update `README.md` and `docs/DEVELOPMENT.md` with the new routes, three languages, tool behaviors, color model caveats, local privacy, and CSV limit.
- [ ] Expand `tests/e2e/accessibility-responsive.spec.ts`, `catalog.spec.ts`, and `pages-base.spec.ts` to cover the new route set, all dictionary states, mobile controls, and every built asset/worker under `/world-compiler/`.
- [ ] Run `$env:PUBLIC_BASE_PATH='/world-compiler'; $env:PUBLIC_SITE_URL='https://jiehua1995.github.io'; $env:CI='true'; npm run verify` from `C:\GitHub_others\World Complier`; expect check, unit, static build, and full Chromium suite to pass without warnings that indicate failed assertions.
- [ ] Inspect `git status` and `git diff`; ensure no generated test artifacts or user files are included.
- [ ] Commit documentation and final regression tests as `docs: document expanded tool platform`.

## Handoff

Implementation is local-only unless the user separately asks to push. After full verification, report the commit, test counts, and preview URL; do not enable or change remote settings as part of this plan.

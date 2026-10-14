# World Compiler V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bilingual, theme-aware Astro static tool catalog whose first production tool, Color Vision Lab, imports, compares, and exports images entirely in the browser.

**Architecture:** Astro statically renders the catalog and workbench shell, while focused framework-free TypeScript modules provide locale, theme, filtering, image processing, worker orchestration, and export behavior. Pure functions sit behind browser adapters so Vitest can exercise core behavior and Playwright can prove the integrated local-only workflow under a GitHub Pages base path.

**Tech Stack:** Astro (static output), strict TypeScript, CSS, Canvas 2D, Web Worker, Vitest with jsdom, Playwright Chromium, npm, GitHub Actions/Pages.

**Spec:** `docs/superpowers/specs/2026-10-14-world-compiler-design.md`

## Global Constraints

- The repository remains local on branch `main`; do not create, add, or push a remote.
- Use Astro static output and framework-free TypeScript; do not add React, Vue, a CSS framework, analytics, remote fonts, or server code.
- Use the supplied palette `#FCA104`, `#2F6DB3`, `#E56C57`, `#5200A6`, `#CDB742`, and `#45A6B2`, extended only with accessible neutral and state ramps.
- Support Simplified Chinese and English across visible copy, document metadata, accessible labels, errors, announcements, and download filenames.
- Support light, dark, and system theme preferences with local persistence and no initial wrong-theme flash.
- Image bytes, filenames, pixels, and interaction events never leave the browser; the application must make no upload or analytics requests.
- Treat simulations as educational approximations, not diagnosis, and display that limitation in both languages.
- Meet WCAG 2.2 AA where applicable, including keyboard operation, visible focus, semantic landmarks, live status, reduced motion, and contrast in both themes.
- Build and test with Node 22 (matching the available `v22.20.0`) and commit `package-lock.json`.
- Configure the production build for a replaceable GitHub Pages base path and make every internal link and asset base-aware.
- Work test-first: run each new test to observe the expected failure before implementing its production behavior.

## Review Focus

- A corrupt or MIME-spoofed image must produce a bilingual recoverable error without leaving stale canvases; Task 6 adds unit and browser coverage.
- Very large dimensions or canvas allocation failure must be rejected or bounded without freezing the tab; Tasks 5 and 6 test sizing limits and error mapping.
- Unavailable or malformed `localStorage` must fall back to browser/system preferences without blocking render; Task 2 tests both locale and theme adapters.
- Replacing/resetting images repeatedly must revoke every temporary object URL and ignore stale worker responses; Tasks 6 and 7 test resource cleanup and request identity.
- A non-root Pages base path must preserve navigation, scripts, workers, images, and browser tests; Tasks 1 and 8 build and exercise `/world-compiler/`.

---

### Task 1: Astro foundation and verification harness

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `.gitignore`
- Create: `.editorconfig`
- Create: `tsconfig.json`
- Create: `astro.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/env.d.ts`
- Create: `src/pages/index.astro`
- Create: `tests/config/astro-config.test.ts`
- Create: `tests/e2e/foundation.spec.ts`

**Interfaces:**
- Produces npm scripts `dev`, `build`, `preview`, `check`, `test`, `test:unit`, `test:e2e`, and `verify`.
- Produces environment-driven `PUBLIC_BASE_PATH` handling with `/world-compiler/` used in production-path verification.
- Produces a Playwright server at `http://127.0.0.1:4321/world-compiler/` running the built preview.

- [ ] **Step 1: Write the failing foundation tests**

`astro-config.test.ts` imports the config and asserts static output plus a normalized `/world-compiler` base when `PUBLIC_BASE_PATH=/world-compiler`; `foundation.spec.ts` expects the built root route to return a page titled with `World Compiler` and no console errors.

- [ ] **Step 2: Run the tests and observe the expected failure**

Run: `npm test -- tests/config/astro-config.test.ts` (after only the minimum test runner manifest exists).  
Expected: FAIL because `astro.config.mjs` and the page do not exist.

- [ ] **Step 3: Add the minimal Astro scaffold and test configuration**

Pin current compatible dependencies in the lockfile, enable strict TypeScript, keep `output: 'static'`, normalize the optional base path, and provide only a semantic placeholder heading needed by the foundation smoke test.

- [ ] **Step 4: Verify the foundation**

Run: `npm run test:unit -- tests/config/astro-config.test.ts && npm run build && npm run test:e2e -- tests/e2e/foundation.spec.ts`  
Expected: unit test, build, and Chromium smoke test pass.

- [ ] **Step 5: Commit**

```text
git add package.json package-lock.json .gitignore .editorconfig tsconfig.json astro.config.mjs vitest.config.ts playwright.config.ts src tests
git commit -m "build: scaffold Astro site and test harness"
```

### Task 2: Locale and theme foundations

**Files:**
- Create: `src/i18n/types.ts`
- Create: `src/i18n/dictionaries.ts`
- Create: `src/i18n/locale.ts`
- Create: `src/theme/theme.ts`
- Create: `src/scripts/preferences.ts`
- Create: `tests/i18n/locale.test.ts`
- Create: `tests/theme/theme.test.ts`

**Interfaces:**
- Produces `type Locale = 'zh-CN' | 'en'` and `resolveLocale(stored: string | null, browserLanguages: readonly string[]): Locale`.
- Produces `dictionary(locale: Locale): Dictionary` with identical typed Chinese and English keys, plus `type DictionaryKey = keyof Dictionary`.
- Produces `type ThemePreference = 'system' | 'light' | 'dark'`, `resolveThemePreference(stored: string | null): ThemePreference`, and `resolveTheme(preference: ThemePreference, systemDark: boolean): 'light' | 'dark'`.
- Produces `safeStorage` behavior that treats denied reads/writes as unavailable rather than fatal.

- [ ] **Step 1: Write failing locale and theme tests**

Assert Chinese default, English browser selection, invalid stored-value fallback, dictionary key parity, stored preference priority, system-dark resolution, malformed storage recovery, and thrown-storage recovery.

- [ ] **Step 2: Run the tests and observe missing-module failures**

Run: `npm run test:unit -- tests/i18n/locale.test.ts tests/theme/theme.test.ts`  
Expected: FAIL because locale/theme modules do not exist.

- [ ] **Step 3: Implement locale dictionaries and preference resolvers**

Keep resolution pure; isolate storage and DOM mutation in `preferences.ts`. Export one initializer that updates `html.lang`, `html.dataset.theme`, translated `[data-i18n]` nodes, metadata, and control state.

- [ ] **Step 4: Run the focused and full unit suites**

Run: `npm run test:unit -- tests/i18n/locale.test.ts tests/theme/theme.test.ts && npm run test:unit`  
Expected: all unit tests pass without warnings.

- [ ] **Step 5: Commit**

```text
git add src/i18n src/theme src/scripts/preferences.ts tests/i18n tests/theme
git commit -m "feat: add bilingual and theme preferences"
```

### Task 3: Shared visual shell and accessible controls

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/SiteHeader.astro`
- Create: `src/components/SiteFooter.astro`
- Create: `src/components/ThemeControl.astro`
- Create: `src/components/LanguageControl.astro`
- Create: `src/components/SignalMark.astro`
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/styles/shell.css`
- Modify: `src/pages/index.astro`
- Create: `tests/e2e/preferences.spec.ts`

**Interfaces:**
- Consumes locale/theme APIs from Task 2.
- Produces `BaseLayout` props `{ titleKey: DictionaryKey; descriptionKey: DictionaryKey; }`.
- Produces stable control names and selectors via semantic roles, not test-only IDs.

- [ ] **Step 1: Write failing browser tests for the shared shell**

Assert skip-link focus, Chinese initial copy, English switch updating `lang/title`, light/dark/system controls, persisted reload behavior, denied-storage fallback, keyboard activation, and no wrong-theme paint observable before hydration.

- [ ] **Step 2: Run the tests against the foundation page**

Run: `npm run build && npm run test:e2e -- tests/e2e/preferences.spec.ts`  
Expected: FAIL because shared controls and translated metadata are absent.

- [ ] **Step 3: Implement the shell and design tokens**

Add the inline pre-paint theme resolver in `<head>`, semantic header/footer, observatory visual tokens, warm-paper light surfaces, deep-navy dark surfaces, visible focus, reduced motion, and responsive spacing. Keep all fonts local/system.

- [ ] **Step 4: Verify shell behavior and accessibility smoke paths**

Run: `npm run check && npm run build && npm run test:e2e -- tests/e2e/preferences.spec.ts`  
Expected: type checks, build, and shell browser tests pass.

- [ ] **Step 5: Commit**

```text
git add src/layouts src/components src/styles src/pages/index.astro tests/e2e/preferences.spec.ts
git commit -m "feat: build bilingual observatory shell"
```

### Task 4: Tool catalog, search, and 6×6 asset language

**Files:**
- Create: `src/data/tools.ts`
- Create: `src/features/catalog/filter-tools.ts`
- Create: `src/scripts/catalog.ts`
- Create: `src/components/HeroConsole.astro`
- Create: `src/components/CatalogControls.astro`
- Create: `src/components/ToolCard.astro`
- Create: `src/components/PrivacyPanel.astro`
- Create: `src/components/RoadmapPanel.astro`
- Create: `src/styles/catalog.css`
- Create: `public/assets/instrument-glyphs/contact-sheet.webp`
- Create: `public/assets/instrument-glyphs/color-vision.webp`
- Create: `docs/assets/instrument-glyph-generation-brief.md`
- Modify: `src/pages/index.astro`
- Create: `tests/catalog/filter-tools.test.ts`
- Create: `tests/e2e/catalog.spec.ts`

**Interfaces:**
- Produces `type ToolCategory = 'vision' | 'text' | 'data' | 'media'` and `interface ToolDefinition { slug; category; status; title; summary; tags; }` with localized fields.
- Produces `filterTools(tools: readonly ToolDefinition[], query: string, category: ToolCategory | 'all', locale: Locale): readonly ToolDefinition[]`.
- Produces a reviewed 6×6 family contact sheet; only the Color Vision glyph is shipped in the visible card UI.

- [ ] **Step 1: Write failing catalog unit and browser tests**

Assert case/whitespace-insensitive English matching, Chinese matching, category intersection, empty results/reset, localized result-count live announcements, no focus jump, and a base-aware link to Color Vision Lab.

- [ ] **Step 2: Run tests and observe feature failures**

Run: `npm run test:unit -- tests/catalog/filter-tools.test.ts && npm run build && npm run test:e2e -- tests/e2e/catalog.spec.ts`  
Expected: FAIL because catalog data, filtering, and interface are absent.

- [ ] **Step 3: Generate and curate the graphic asset family**

Use the image-generation workflow to create one 6×6 contact sheet of 36 geometric instrument glyphs based on the supplied six-color palette, with no words or third-party marks. Retain the contact sheet for design continuity and export only the selected Color Vision glyph for the page.

- [ ] **Step 4: Implement catalog data, filter logic, and full home-page narrative**

Build the status strip, search/category controls, tool cards, local-privacy explanation, and clearly labelled roadmap. Do not invent users, metrics, testimonials, or finished tools.

- [ ] **Step 5: Verify catalog logic, browser behavior, and asset weight**

Run: `npm run test:unit -- tests/catalog/filter-tools.test.ts && npm run build && npm run test:e2e -- tests/e2e/catalog.spec.ts`  
Expected: tests pass; only referenced production assets are loaded by the page.

- [ ] **Step 6: Commit**

```text
git add src/data src/features/catalog src/scripts/catalog.ts src/components src/styles/catalog.css src/pages/index.astro public/assets docs/assets tests/catalog tests/e2e/catalog.spec.ts
git commit -m "feat: add searchable bilingual tool catalog"
```

### Task 5: Tested color-vision simulation core

**Files:**
- Create: `src/features/color-vision/types.ts`
- Create: `src/features/color-vision/matrices.ts`
- Create: `src/features/color-vision/simulate.ts`
- Create: `src/features/color-vision/dimensions.ts`
- Create: `tests/color-vision/simulate.test.ts`
- Create: `tests/color-vision/dimensions.test.ts`

**Interfaces:**
- Produces `type VisionMode = 'original' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'`.
- Produces `type Dimensions = { width: number; height: number }`.
- Produces `transformPixel(r: number, g: number, b: number, a: number, mode: VisionMode): [number, number, number, number]`.
- Produces `transformPixels(source: Uint8ClampedArray, mode: VisionMode): Uint8ClampedArray` without mutating `source`.
- Produces `fitWithin(width: number, height: number, maxEdge: number, maxPixels: number): { width: number; height: number }` and `assertSafeDimensions(width: number, height: number): void`.

- [ ] **Step 1: Write failing transform and dimension tests**

Use fixed black, white, primary, palette, and semi-transparent pixels to assert each matrix's rounded output, channel clamping, alpha preservation, original-mode identity, source immutability, aspect-ratio preservation, zero-dimension rejection, overflow rejection, and extreme-dimension bounding.

- [ ] **Step 2: Run tests and confirm missing behavior**

Run: `npm run test:unit -- tests/color-vision/simulate.test.ts tests/color-vision/dimensions.test.ts`  
Expected: FAIL because the simulation API does not exist.

- [ ] **Step 3: Implement matrices, transforms, and safe sizing**

Use documented fixed matrices in sRGB space, clamp every result to 0–255, preserve alpha, and keep the original input untouched. Document that results are educational approximations.

- [ ] **Step 4: Run focused and full unit suites**

Run: `npm run test:unit -- tests/color-vision/simulate.test.ts tests/color-vision/dimensions.test.ts && npm run test:unit`  
Expected: all unit tests pass.

- [ ] **Step 5: Commit**

```text
git add src/features/color-vision tests/color-vision
git commit -m "feat: add tested color vision transforms"
```

### Task 6: Local image pipeline, worker, and export

**Files:**
- Create: `src/features/color-vision/errors.ts`
- Create: `src/features/color-vision/image-io.ts`
- Create: `src/features/color-vision/simulation.worker.ts`
- Create: `src/features/color-vision/worker-client.ts`
- Create: `src/features/color-vision/export-image.ts`
- Create: `tests/color-vision/image-io.test.ts`
- Create: `tests/color-vision/worker-client.test.ts`
- Create: `tests/color-vision/export-image.test.ts`
- Create: `tests/fixtures/color-grid.png`
- Create: `tests/fixtures/not-an-image.png`

**Interfaces:**
- Produces `decodeLocalImage(file: File): Promise<DecodedImage>` where `DecodedImage` is `{ source: ImageBitmap | HTMLImageElement; width: number; height: number; cleanup(): void }`.
- Produces discriminated `ColorVisionError` codes `unsupported-type`, `decode-failed`, `invalid-dimensions`, `too-large`, `processing-failed`, and `export-failed`.
- Produces `SimulationWorkerClient.process(requestId: number, pixels: Uint8ClampedArray, mode: VisionMode): Promise<Uint8ClampedArray>` and `dispose(): void`.
- Produces `exportSimulation(source: CanvasImageSource, dimensions: Dimensions, mode: VisionMode, options: { format: 'image/png' | 'image/jpeg'; quality?: number }): Promise<Blob>`.

- [ ] **Step 1: Write failing local-pipeline tests**

Assert valid decode metadata, unsupported and MIME-spoofed inputs, corrupt decode mapping, dimension limits, cleanup revocation exactly once, stale worker response rejection, transferred-result correctness, PNG/JPEG MIME output, alpha behavior, and canvas/export failure mapping.

- [ ] **Step 2: Run tests and observe missing pipeline failures**

Run: `npm run test:unit -- tests/color-vision/image-io.test.ts tests/color-vision/worker-client.test.ts tests/color-vision/export-image.test.ts`  
Expected: FAIL because adapters and error types do not exist.

- [ ] **Step 3: Implement browser adapters and worker protocol**

Validate declared type plus successful decode, use `createImageBitmap` with an `HTMLImageElement` fallback, transfer pixel buffers to the worker, correlate monotonic request IDs, revoke resources on replace/reset/dispose, and render exports from original dimensions.

- [ ] **Step 4: Verify local-pipeline unit tests**

Run: `npm run test:unit -- tests/color-vision/image-io.test.ts tests/color-vision/worker-client.test.ts tests/color-vision/export-image.test.ts && npm run test:unit`  
Expected: pipeline and full unit suites pass without leaked handles.

- [ ] **Step 5: Commit**

```text
git add src/features/color-vision tests/color-vision tests/fixtures
git commit -m "feat: process and export images locally"
```

### Task 7: Color Vision Lab workbench

**Files:**
- Create: `src/pages/tools/color-vision.astro`
- Create: `src/components/tools/ColorVisionWorkbench.astro`
- Create: `src/components/tools/DropZone.astro`
- Create: `src/components/tools/ComparisonCard.astro`
- Create: `src/components/tools/PreviewDialog.astro`
- Create: `src/components/tools/ExportPanel.astro`
- Create: `src/features/color-vision/controller.ts`
- Create: `src/styles/color-vision.css`
- Create: `tests/color-vision/controller.test.ts`
- Create: `tests/e2e/color-vision.spec.ts`

**Interfaces:**
- Consumes Tasks 2, 3, 5, and 6.
- Produces `mountColorVisionLab(root: HTMLElement): { destroy(): void }`.
- Produces semantic mode cards for all five `VisionMode` values and a focus-managed preview dialog.

- [ ] **Step 1: Write failing controller and browser tests**

Assert picker and drag/drop parity, fixture import, five labelled previews, bilingual progress/error states, latest-request-wins behavior, focus dialog open/close/restore, mode export download, JPEG quality control visibility, reset cleanup, corrupt-file recovery, keyboard-only completion, and no request containing fixture bytes or filename.

- [ ] **Step 2: Run the tests against the absent workbench**

Run: `npm run test:unit -- tests/color-vision/controller.test.ts && npm run build && npm run test:e2e -- tests/e2e/color-vision.spec.ts`  
Expected: FAIL because the route and controller do not exist.

- [ ] **Step 3: Implement the accessible workbench and controller state machine**

Use explicit states `empty`, `decoding`, `processing`, `ready`, and `error`; ignore stale async completions; keep the original available; update canvas accessible descriptions; and leave all controls usable at phone width.

- [ ] **Step 4: Verify unit and integrated Color Vision flows**

Run: `npm run test:unit -- tests/color-vision/controller.test.ts && npm run build && npm run test:e2e -- tests/e2e/color-vision.spec.ts`  
Expected: controller and Chromium workbench tests pass, including download and no-upload assertions.

- [ ] **Step 5: Commit**

```text
git add src/pages/tools src/components/tools src/features/color-vision/controller.ts src/styles/color-vision.css tests/color-vision/controller.test.ts tests/e2e/color-vision.spec.ts
git commit -m "feat: launch Color Vision Lab workbench"
```

### Task 8: Responsive, accessibility, and Pages-base regression pass

**Files:**
- Create: `tests/e2e/accessibility-responsive.spec.ts`
- Create: `tests/e2e/pages-base.spec.ts`
- Modify: `src/styles/global.css`
- Modify: `src/styles/catalog.css`
- Modify: `src/styles/color-vision.css`
- Modify: affected Astro components only when a failing test identifies a semantic issue

**Interfaces:**
- Consumes the complete catalog and workbench.
- Produces verified desktop (1440×900) and phone (390×844) paths under `/world-compiler/`.

- [ ] **Step 1: Write failing cross-page regression tests**

Assert no horizontal overflow, logical heading/landmark structure, visible focus during keyboard traversal, reduced-motion behavior, 44px practical control targets, working base-aware navigation/assets/worker, and usable comparison/export controls at both viewports.

- [ ] **Step 2: Run the regression tests and record concrete failures**

Run: `npm run build && npm run test:e2e -- tests/e2e/accessibility-responsive.spec.ts tests/e2e/pages-base.spec.ts`  
Expected: at least one assertion fails before the responsive/accessibility hardening pass.

- [ ] **Step 3: Make the smallest semantic and CSS corrections required by the failures**

Do not redesign passing features. Correct only measured overflow, focus, target-size, motion, landmark, or base-path defects.

- [ ] **Step 4: Verify the full browser suite**

Run: `npm run build && npm run test:e2e`  
Expected: all Chromium tests pass at the configured base path.

- [ ] **Step 5: Commit**

```text
git add src tests/e2e
git commit -m "test: harden accessibility and responsive layouts"
```

### Task 9: Documentation and GitHub Pages workflow

**Files:**
- Create: `README.md`
- Create: `.github/workflows/deploy.yml`
- Create: `LICENSE`
- Create: `tests/config/deployment.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces a bilingual contributor README and an official Pages Actions workflow for pushes to `main` plus manual dispatch.
- Produces a single `npm run verify` command covering Astro checks, unit tests, production build, and browser tests.

- [ ] **Step 1: Write the failing deployment configuration test**

Assert that the workflow has `contents: read`, `pages: write`, `id-token: write`, uses the official Astro build action and Pages deploy action, targets `main`, and that package scripts expose `verify`.

- [ ] **Step 2: Run the deployment test and observe failure**

Run: `npm run test:unit -- tests/config/deployment.test.ts`  
Expected: FAIL because the workflow and final script do not exist.

- [ ] **Step 3: Add README, MIT license, workflow, and final scripts**

Document mission, privacy, palette provenance, educational limitation, Node/npm setup, commands, base-path configuration, later remote setup, Pages settings, project structure, and the exact process for adding a bilingual tool. Use official `withastro/action` and `actions/deploy-pages` versions current at implementation time.

- [ ] **Step 4: Run fresh full verification**

Run: `npm run verify`  
Expected: Astro checks report zero errors, every unit and browser test passes, and production build exits 0.

- [ ] **Step 5: Inspect the generated artifact and repository state**

Run: `git diff --check && git status --short && Get-ChildItem -Recurse dist | Measure-Object -Property Length -Sum`  
Expected: no whitespace errors; only intended documentation/workflow changes remain before commit; `dist` contains both catalog and tool routes with bounded total size.

- [ ] **Step 6: Commit**

```text
git add README.md LICENSE .github package.json tests/config/deployment.test.ts
git commit -m "docs: prepare World Compiler for Pages"
```

## Final verification gate

- [ ] Run `npm run verify` again from a clean working tree and record exact test/build counts.
- [ ] Run `git status --short --branch` and `git log --oneline --decorate -10`.
- [ ] Review the acceptance criteria in the design specification line by line.
- [ ] Confirm no remote exists with `git remote -v`.
- [ ] Open the built site locally for a visual pass in both languages, both explicit themes, system theme, desktop, and phone layouts.
- [ ] Report any limitation honestly; do not describe the project as complete unless every required check has fresh passing evidence.

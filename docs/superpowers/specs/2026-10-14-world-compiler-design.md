# 世界编译局 / World Compiler — Design Specification

**Date:** 2026-10-14  
**Status:** Awaiting review  
**Project root:** `C:\GitHub_others\World Complier`

## 1. Product intent

World Compiler is a bilingual, public-interest collection of browser-based tools. It should make specialized visual and analytical tasks approachable without accounts, uploads, tracking, or server-side processing. The first release must feel like a credible foundation for a growing open-source catalog rather than a single-tool demo.

Success for the first release means:

- visitors can understand the platform and open a useful tool immediately;
- the complete interface works in Simplified Chinese and English;
- light, dark, and system themes are readable and visually intentional;
- the Color Vision Lab imports, compares, and exports images entirely in the browser;
- the site remains usable with keyboard navigation, reduced motion, narrow screens, and assistive technology;
- tests and a GitHub Pages workflow make future contributions safe to ship.

## 2. Scope

### Included

- A polished catalog home page with search, category filters, tool cards, privacy positioning, and a clear route into Color Vision Lab.
- One production-quality tool: Color Vision Lab.
- Five comparison views: original, protanopia, deuteranopia, tritanopia, and achromatopsia.
- Local image import by file picker and drag-and-drop.
- Responsive real-time previews, focused single-view inspection, and PNG/JPEG export.
- Chinese/English switching and light/dark/system theme controls with local preference persistence.
- A reusable content model, layout system, tool-shell pattern, design tokens, and asset pipeline for later tools.
- README, automated unit and browser tests, static build, and GitHub Pages deployment configuration.

### Excluded from the first release

- Accounts, cloud storage, analytics, cookies, remote image processing, or other back-end services.
- Remote repository creation or pushing. The local repository starts on `main`; a remote can be added later.
- Additional working tools beyond Color Vision Lab. Future tools may appear only as clearly labelled roadmap cards.
- Medical diagnosis claims. Simulations are educational approximations and will say so.

## 3. Technical architecture

Use Astro in static-output mode with strict TypeScript. Astro owns pages, layouts, content, and build-time rendering; small framework-free TypeScript modules own interactive islands. This keeps the baseline lightweight while allowing the catalog to expand into more pages and tools without restructuring the project.

Primary boundaries:

- `src/pages/` contains the catalog and Color Vision Lab routes.
- `src/layouts/` contains the shared document shell, metadata, skip link, header, and footer.
- `src/components/` contains reusable Astro presentation components.
- `src/features/color-vision/` contains image decoding, simulation, preview orchestration, and export code.
- `src/i18n/` contains typed dictionaries and runtime locale behavior.
- `src/theme/` contains theme preference behavior.
- `src/data/tools.ts` is the single catalog source of truth.
- `src/styles/` contains tokens, foundations, components, and page-specific styles.
- `public/assets/` contains static identity and tool artwork.

Astro's base path will be configurable through the repository name so the same build works at a GitHub Pages project URL. All links and assets must respect that base path. The finished site must not require network access after its static files load.

## 4. Information architecture

### Catalog page

The page follows a purposeful progression:

1. A compact masthead introduces World Compiler as an open public tool station.
2. A live status strip communicates local-only processing, open-source intent, and the number of available tools.
3. Search and category controls narrow the catalog without navigation or reloads.
4. Tool cards show title, short purpose, category, status, privacy behavior, and keyboard-accessible action.
5. A privacy explanation makes “your files never leave this device” concrete.
6. A restrained roadmap/contribution section explains how the platform will grow without presenting fictional capabilities as finished.

Empty search results show a useful reset action. Filtering must not move keyboard focus unexpectedly, and result counts are announced through a polite live region.

### Color Vision Lab page

The tool uses a focused workbench layout:

- concise title, educational disclaimer, and local-processing badge;
- drop zone/file picker with supported formats and size guidance;
- a 2×2 or adaptive comparison grid for simulated modes, with the original available alongside them;
- mode controls with human-readable names in both languages;
- a focused preview dialog or panel for detailed inspection;
- export controls for selected mode, output format, and quality where applicable;
- clear reset/change-image actions and non-destructive errors.

Before an image is loaded, the workbench uses an intentional sample/empty state rather than blank rectangles. On narrow screens, comparisons become a single-column sequence and controls remain reachable without horizontal scrolling.

## 5. Color simulation and local data flow

The browser decodes the selected local image, downscales only the interactive preview to a safe working resolution, and retains the original source for final export. A color transform module converts sRGB values through tested simulation matrices for protanopia, deuteranopia, tritanopia, and achromatopsia. Alpha is preserved.

Processing flow:

1. Validate that the selection is a supported decodable image.
2. Decode locally using browser APIs.
3. Calculate an aspect-ratio-preserving preview size bounded for responsiveness and memory safety.
4. Render each requested mode to its own canvas, scheduling work so the interface remains responsive.
5. When exporting, process the original dimensions and create a local `Blob` download.
6. Revoke temporary object URLs when replaced or the tool is reset.

The implementation must handle corrupt images, unsupported formats, zero-sized decode results, oversized dimensions, and canvas allocation/export failure with bilingual, actionable messages. No file contents, filenames, pixel data, or usage events leave the page.

## 6. Visual system

The visual direction is a “public technology observatory”: precise, civic-minded, and quietly futuristic. It avoids a generic neon dashboard. Structure comes from fine rules, offset panels, calibrated spacing, compact labels, and subtle grid/radar motifs; motion reinforces state changes rather than decorating the page.

The supplied palette is the seed:

- signal amber `#FCA104`;
- institutional blue `#2F6DB3`;
- coral `#E56C57`;
- lunar violet `#5200A6`;
- chartreuse-gold `#CDB742`;
- observatory cyan `#45A6B2`.

These colors are extended with neutral ink, paper, deep-space, and surface ramps. Blue/cyan carry navigation and trusted actions; amber marks active signals; coral marks warnings; violet is used sparingly for identity and depth. The full set is never placed indiscriminately on one screen. Text/background combinations must meet WCAG AA contrast, so some supplied colors will be darkened or lightened for specific foreground uses.

Light mode uses warm paper surfaces with dark blue-black ink. Dark mode uses deep navy rather than pure black, with muted luminous accents. System mode follows `prefers-color-scheme`; explicit choices override it and are stored locally.

Typography uses a dependable system/CJK stack to avoid remote font requests. Display hierarchy comes from size, weight, tracking, and bilingual composition instead of downloaded typefaces.

## 7. Graphic asset system

Identity and category graphics use a repeatable 36-asset family arranged and reviewed as 6×6 contact sheets. Each asset is a simple geometric “instrument glyph” built from a shared grid, stroke weight, corner logic, and six-color palette. This makes future online generation efficient while preserving consistency.

For the first release, only assets actually visible in the catalog and Color Vision Lab are exported into the site. The repository may retain the 6×6 source/contact sheet and generation brief, but it will not ship 36 unused images to visitors. Raster artwork is generated at high resolution and exported in modern formats; functional icons remain SVG or CSS where crisp scaling and accessibility matter.

Generated visuals must contain no embedded words, logos of other organizations, or decorative text that would conflict with bilingual UI. Informative images receive alt text; decorative images use empty alt text.

## 8. Internationalization

Chinese and English strings live in structurally identical typed dictionaries. Chinese is the initial language unless a stored preference or browser preference selects English. The root `lang`, document title, metadata, visible copy, accessible labels, errors, live announcements, and download filenames update together.

Routes remain language-neutral for GitHub Pages simplicity. Language switching is client-side and persists in local storage. Content must not depend on equal string length: buttons and cards accommodate longer English labels and Chinese line breaking.

## 9. Accessibility and responsive behavior

The baseline target is WCAG 2.2 AA where applicable:

- semantic landmarks, heading order, and a skip link;
- visible focus and full keyboard operation;
- minimum practical target sizes for interactive controls;
- instructions that do not rely only on color or drag-and-drop;
- status and validation announcements through live regions;
- dialogs/panels with correct focus management;
- reduced-motion support and no essential information conveyed by animation;
- comparison labels and accessible text alternatives for canvas content;
- contrast verified in both themes.

Layout breakpoints are content-driven. The catalog and workbench support small phones through wide desktops, while avoiding fixed viewport-height sections and horizontal scrolling.

## 10. Testing and verification

Use Vitest for pure logic and DOM behavior where appropriate, and Playwright for critical browser flows.

Unit coverage includes:

- known pixel transformations for every simulation mode;
- alpha preservation and channel clamping;
- preview size calculation and extreme image dimensions;
- typed dictionary parity and locale fallback;
- theme resolution for stored, system, and invalid preferences;
- catalog search/filter matching in both languages.

Browser coverage includes:

- catalog search, category reset, and language switching;
- light/dark/system controls and persistence;
- keyboard navigation and visible accessible names;
- local fixture import, comparison rendering, mode selection, reset, and export initiation;
- mobile and desktop smoke paths;
- no application request that uploads the imported fixture.

Final verification runs formatting/type checks, unit tests, browser tests, and the production build. The built output is inspected under the configured GitHub Pages base path.

## 11. Documentation and deployment

The bilingual README explains the mission, privacy model, local development, tests, build, repository naming/base-path behavior, deployment, and how to add a future tool. It includes the educational limitation of color-vision simulation and credits the palette as user-provided.

GitHub Actions runs checks and builds the static site before deploying the artifact to GitHub Pages. The workflow uses Pages-native actions and does not assume a remote already exists. Local development remains independent of GitHub.

## 12. Acceptance criteria

The first release is ready when:

- `npm install`, checks, tests, and `npm run build` succeed on the documented Node version;
- the generated site works from a non-root base path;
- catalog search and filters are useful in both languages;
- all three theme choices work without a flash of the wrong theme on reload;
- Color Vision Lab imports a local image, renders all four simulations plus the original, and exports a selected result without network transfer;
- primary flows work with keyboard only and at phone width;
- no unlabelled placeholder, fake metric, or unfinished control appears as a released capability;
- README and Pages workflow are complete for later remote setup.

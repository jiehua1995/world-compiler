# Markdown Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate Markdown report/table flows with one safe, multilingual live Markdown editor while retaining both public URLs.

**Architecture:** Add one Markdown feature module for parsing, GFM rendering, CSV/TSV table insertion, and line-based diagnostics. Reuse the existing Astro tool page, CSS tokens, clipboard/download helper, and controller mount; branch only the two Markdown slugs into a dedicated editor view.

**Tech Stack:** Astro, TypeScript, markdown-it, Vitest, Playwright.

**Spec:** `docs/TOOL-QUALITY-ROADMAP.md` — “Markdown Studio 的首个专业版本”.

## Global Constraints

- The original Markdown remains editable and is never auto-saved.
- Raw HTML/scripts are not executed; external Markdown images are not auto-requested.
- Keep `/tools/markdown-studio/` and `/tools/markdown-table/` working.
- Main workflows have Chinese, English, German labels and keyboard access.

## Review Focus

- Unsafe protocols in Markdown links remain inert.
- Empty/malformed CSV/TSV does not silently produce a misleading table.
- Large but allowed editor input keeps preview usable and remains capped at one million characters.
- Mobile users can reach both editor and preview without horizontal overflow.
- Diagnostics for repeated headings and malformed/incomplete links do not crash or point to the wrong line.

---

### Task 1: Safe Markdown core

**Files:**
- Create: `src/features/markdown-studio/core.ts`
- Modify: `package.json`, lockfile
- Test: `tests/markdown-studio/core.test.ts`

**Interfaces:**
- Produces `renderMarkdown(markdown: string): string`, `inspectMarkdown(markdown: string)`, and `markdownTableFromDelimited(text: string, delimiter: ',' | '\t'): string`.

- [x] Write failing tests for GFM tables/task lists, raw HTML and remote images suppression, unsafe URLs, diagnostics line numbers, and quoted CSV cells/pipe escaping.
- [x] Run `npm run test:unit -- tests/markdown-studio/core.test.ts` and confirm failures are missing exports/behavior.
- [x] Add `markdown-it` with raw HTML disabled; block image rendering and permit only safe link protocols; use existing CSV parser for table generation.
- [x] Run the focused test and full unit suite.

### Task 2: Live editor workflow

**Files:**
- Modify: `src/components/tools/ProWorkbench.astro`
- Modify: `src/features/pro-tools/controller.ts`
- Modify: `src/styles/workbench.css`
- Test: `tests/e2e/pro-tools.spec.ts`

**Interfaces:**
- Consumes the Task 1 core functions; no new app-wide state or persistence.

- [x] Add browser tests for live preview, toolbar/table insertion at the caret, diagnostics navigation, copy/download, mobile editor-preview switch, and no script execution.
- [x] Run the focused browser test and confirm expected missing controls/behavior.
- [x] Add a dedicated three-locale Markdown Studio view for both existing slugs; keep existing generic controller behavior for all other tools.
- [x] Render desktop side-by-side editor/preview, mobile editor/preview tabs, document statistics, TOC, structural diagnostics, and toolbar.
- [x] Verify the focused browser test and existing legacy Markdown table test.

### Task 3: Finish and verify

**Files:**
- Modify: `src/data/pro-tools.ts`
- Modify: `README.md`, `README.en.md` only if existing Markdown feature descriptions need correction.
- Test: existing unit/e2e suites.

- [x] Update the two tool summaries to describe the merged workflow and compatibility URL.
- [x] Run `npm run check`, `npm run test:unit`, `npm run build`, and the full Playwright suite.
- [x] Review the working diff for unrelated-file changes; do not stage or modify the user's existing uncommitted work.

## Review outcome

- Fixed diagnostic cursor offsets for LF, CRLF, and CR source documents; regression test covers CRLF.
- Deferred minor: structural diagnostics currently scan fenced code contents, so Markdown-looking lines inside code fences may be reported.
- Deferred minor: the word/character status region is live and updates while typing, which may be chatty for screen readers.
- Final verification: `npm run verify` — Astro check, 133 unit tests, production build (52 routes), and 100 Playwright tests passed.

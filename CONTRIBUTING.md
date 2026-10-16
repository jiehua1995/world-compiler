# 贡献指南 / Contributing

[在线使用 / Use online](https://jiehua1995.github.io/world-compiler/tools/) · [中文 README](README.md) · [English README](README.en.md)

感谢你帮助世界编译局变得更有用。我们优先接受能解决真实问题、可在浏览器本地运行、边界清楚且易于测试的改进。提交新工具前，请先搜索目录，避免重复功能。

Thanks for helping make World Compiler more useful. We prioritize changes that solve a real need, run locally in the browser, define their limits, and are easy to test. Search the catalog before proposing a new tool to avoid duplication.

## 新工具开发 / Build a tool

当前站点是 Astro 静态输出，没有应用服务器、数据库或 API。对简单工具，复用通用工作台即可；只有确需独立交互时才新增专用 Astro 页面。

The site is statically generated with Astro and has no application server, database, or API. Reuse the generic workbench for straightforward tools; add a dedicated Astro page only when the interaction genuinely requires it.

1. **目录与入口 / Catalog:** Add a unique kebab-case slug, category, title, summary, tags, and icon to `src/data/pro-tools.ts` (generic workbench) or `src/data/native-tools.ts` (native browser feature). All visible title/summary copy must be Chinese, English, and German. Tool routes are generated from the catalog.
2. **界面 / Interface:** Extend `src/components/tools/ProWorkbench.astro` for inputs/controls, and `src/features/pro-tools/controller.ts` for orchestration. For focused tools, put pure calculations under `src/features/<area>/`; keep DOM work in controllers. Reuse the existing workbench, status, copy, and download patterns.
3. **计算 / Logic:** Validate content and resource limits before expensive work. Keep user content in memory; do not log, persist, upload, or send it to third parties. File tools need explicit type, size, pixel/page/duration limits and clear failure states. Network access must be necessary, user-initiated, and documented.
4. **可访问性 / Accessibility:** Use associated labels, keyboard-operable native controls, visible focus, meaningful status announcements, responsive layouts, and all three locales for dynamic messages/errors. Never encode meaning only by color.
5. **测试 / Tests:** Add unit tests for pure logic and edge cases in `tests/`; add Playwright coverage for the tool route and primary workflow in `tests/e2e/`. Check base-path links and all supported locales. Do not claim support broader than your tests.
6. **依赖与图形 / Dependencies & artwork:** Prefer existing browser APIs and installed packages. New dependencies need a clear need and compatible license; update `public/THIRD_PARTY_NOTICES.txt` when required. Reuse the 36-icon sheet before requesting new artwork; generated assets and source notes belong in `docs/assets/` and shipped artwork in `public/assets/`.
7. **文档 / Documentation:** Add a row to the professional tools list in `docs/2026-10-15-professional-tools.md` (or the relevant feature doc), stating what it does and what it does not do. Update both READMEs only when the high-level catalog or usage guidance changes.

### 验证 / Verify

Use Node.js 22+ and npm. The full suite is the merge gate:

```bash
npm ci
npm run verify
```

`verify` runs Astro/TypeScript checks, Vitest, the production build (including PWA assets), and Playwright browser tests. GitHub Actions runs the same command before publishing to GitHub Pages. For deployment-path testing, set `PUBLIC_BASE_PATH=/world-compiler` and `PUBLIC_SITE_URL=https://jiehua1995.github.io` before building.

## 提交 Pull Request / Submit a pull request

1. Fork `jiehua1995/world-compiler`, clone your fork, and create a focused branch from `main` (for example, `feat/unicode-inspector`).
2. Install with `npm ci`; make the smallest complete change and include tests/docs.
3. Run `npm run verify`; resolve failures and review `git diff` for accidental files or user data.
4. Push the branch to your fork and open a PR targeting `jiehua1995/world-compiler:main`.
5. In the PR description, explain the user problem, behavior and limits, privacy/network behavior, tests run, and include before/after screenshots for visible UI changes. Link related issues if available.
6. Keep the PR focused and respond to review feedback with follow-up commits. CI must pass; do not include secrets, real personal data, generated build output, or unrelated formatting churn.

1. Fork `jiehua1995/world-compiler`, clone your fork, and create a focused branch from `main` (for example, `feat/unicode-inspector`).
2. Run `npm ci`; make the smallest complete change and include tests and docs.
3. Run `npm run verify`; fix failures and inspect `git diff` for accidental files or user data.
4. Push your branch to your fork and open a PR targeting `jiehua1995/world-compiler:main`.
5. Describe the user problem, behavior and limits, privacy/network behavior, tests run, and add before/after screenshots for UI changes. Link any related issues.
6. Keep the PR focused and follow up on review feedback. CI must pass; do not include secrets, real personal data, build output, or unrelated formatting churn.

## 设计原则 / Principles

- 公益、可访问、无账户；默认本地优先。 / Public-good, accessible, account-free; local-first by default.
- 如实说明近似、兼容性和安全边界。 / State approximation, compatibility, and security boundaries honestly.
- 不绕过授权、DRM、CORS 或付费访问控制。 / Never bypass authorization, DRM, CORS, or paid-access controls.
- 处理失败时保留原始输入，不静默丢弃。 / Preserve original input on failure; never discard it silently.
- 维持三语文案和明暗主题下的一致体验。 / Keep Chinese, English, and German copy consistent across light and dark themes.

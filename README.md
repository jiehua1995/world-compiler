# 世界编译局 / World Compiler

一个面向公共利益的开源浏览器工具平台。它把常用但分散的小工具做成清晰、可靠、可访问的网页应用；数据默认只在浏览器中处理。

An open-source browser toolkit for the public good. It turns useful but scattered utilities into clear, reliable, accessible web apps, with data processed locally in the browser by default.

## 当前版本 / What is included

- 中英文界面，可即时切换 / Chinese and English interfaces with instant switching
- 浅色、深色与跟随系统主题 / Light, dark, and system themes
- 可搜索、可分类的工具目录 / Searchable, filterable tool catalog
- **色觉实验室 / Color Vision Lab**：本地导入图片，实时对比原图、红色盲、绿色盲、蓝色盲与全色盲模拟，并导出 PNG 或 JPEG
- 响应式布局、键盘操作、焦点样式、减少动态效果支持 / Responsive layout, keyboard support, visible focus, and reduced-motion support
- Astro 静态构建与 GitHub Pages 自动部署配置 / Static Astro build and GitHub Pages deployment workflow

色觉模拟是帮助设计检查与理解差异的近似工具，不是医学诊断。图片不会上传到服务器。

Color-vision simulations are approximations for design review and understanding differences, not medical diagnosis. Images are never uploaded to a server.

## 本地开发 / Local development

需要 Node.js 22 或更高版本，以及 npm。

Requires Node.js 22 or later and npm.

```bash
npm ci
npm run dev
```

常用命令 / Useful commands:

```bash
npm run check       # Astro and TypeScript checks
npm run test:unit   # unit and configuration tests
npm run build       # production build
npm run test:e2e    # browser tests
npm run verify      # all checks above
```

`npm run verify` 顺序执行 Astro/TypeScript 检查、单元与配置测试、静态生产构建和 Chromium 浏览器测试。首次运行浏览器测试前，请安装 Playwright 使用的 Chromium：

`npm run verify` runs Astro/TypeScript checks, unit and configuration tests, a static production build, and Chromium browser tests in sequence. Install Playwright's Chromium before the first browser test:

```bash
npx playwright install chromium
```

默认部署子路径是 `/world-compiler`。本地开发服务器会自动使用这个路径。GitHub 仓库名不同或需要部署到根路径时，需同时更新工作流中的 `PUBLIC_BASE_PATH`；当前正式站点地址为 `https://jiehua1995.github.io/world-compiler/`。

The default deployment base path is `/world-compiler`, which is also used by the local development server. For a different GitHub repository name or a root deployment, update `PUBLIC_BASE_PATH` in the workflow as well as setting it locally. Set `PUBLIC_SITE_URL` when a canonical production URL is available.

```powershell
$env:PUBLIC_BASE_PATH = "/my-repository"
$env:PUBLIC_SITE_URL = "https://example.github.io"
npm run build
```

## GitHub Pages 部署 / GitHub Pages deployment

仓库地址：<https://github.com/jiehua1995/world-compiler>。网站地址：<https://jiehua1995.github.io/world-compiler/>。工作流 `.github/workflows/deploy.yml` 会在 `main` 有新提交时运行完整验证、构建静态站点并发布到 GitHub Pages，也可在 Actions 页面手动运行。

Repository: <https://github.com/jiehua1995/world-compiler>. Site: <https://jiehua1995.github.io/world-compiler/>. The `.github/workflows/deploy.yml` workflow runs the full verification suite, builds the static site, and deploys to GitHub Pages on every push to `main`; it can also be run manually from Actions.

首次部署前，请在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。项目站点路径 `/world-compiler` 与仓库名一致；工作流中 `PUBLIC_SITE_URL` 为 GitHub Pages 用户站点域名，`PUBLIC_BASE_PATH` 为仓库子路径。后续推送 `main` 即自动更新网页。

Before the first deployment, select **GitHub Actions** in **Settings → Pages → Build and deployment → Source**. The project-site path `/world-compiler` matches the repository name; `PUBLIC_SITE_URL` in the workflow is the GitHub Pages user-site origin and `PUBLIC_BASE_PATH` is the repository subpath. Future pushes to `main` publish automatically.

## 扩展工具 / Adding a tool

1. 在 `src/data/tools.ts` 添加双语工具条目，slug 与页面路由保持一致。
2. 在 `src/pages/tools/` 创建 Astro 页面，复用 `BaseLayout` 和现有工具页面结构。
3. 将可切换的界面文案补入 `src/i18n/dictionaries.ts`；动态生成的标签也要提供中英版本。
4. 把核心计算放在 `src/features/<tool>/`，为纯逻辑编写单元测试，再为完整操作流程编写浏览器测试。
5. 如果工具需要图形资产，将成品放入 `public/assets/instrument-glyphs/`，并将生成说明与源图放入 `docs/assets/`。

1. Add a bilingual tool entry to `src/data/tools.ts`; keep its slug aligned with the page route.
2. Create an Astro page in `src/pages/tools/` and reuse `BaseLayout` and the existing tool-page structure.
3. Add switchable interface copy to `src/i18n/dictionaries.ts`; dynamic labels need Chinese and English variants too.
4. Put core calculations in `src/features/<tool>/`, cover pure logic with unit tests, then test the full user flow in a browser.
5. If the tool needs artwork, put production assets in `public/assets/instrument-glyphs/` and generation notes/source sheets in `docs/assets/`.

详细架构、图片数据流、隐私边界和排障方法见 [开发指南 / Development guide](docs/DEVELOPMENT.md)。

For architecture, image data flow, privacy boundaries, and troubleshooting, see the [Development guide](docs/DEVELOPMENT.md).

## 项目结构 / Project structure

```text
src/components/       shared interface and tool components
src/data/             catalog definitions
src/features/         framework-independent tool logic
src/i18n/             bilingual dictionaries and locale helpers
src/pages/            Astro routes
src/styles/           visual system and responsive styles
tests/                unit, configuration, and browser tests
docs/assets/          visual-generation briefs and source sheets
```

`docs/superpowers/` 保存本地设计规格与实施计划，供项目维护时参考；开发和运行网站不依赖这些文件。

`docs/superpowers/` contains the local design specification and implementation plan for maintainers; the site does not depend on these files at build or runtime.

配色起点来自项目方提供的参考图：`#FCA104`、`#2F6DB3`、`#E56C57`、`#5200A6`、`#CDB742`、`#45A6B2`，并扩展为适用于明暗主题的设计变量。

The palette begins with the project-provided reference colors `#FCA104`, `#2F6DB3`, `#E56C57`, `#5200A6`, `#CDB742`, and `#45A6B2`, expanded into design tokens for light and dark themes.

## License

[MIT](LICENSE) © 2026 World Compiler contributors

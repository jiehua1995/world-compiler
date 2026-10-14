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
npm install
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

默认部署子路径是 `/world-compiler`。本地开发服务器会自动使用这个路径。仓库名不同或需要部署到根路径时，可设置 `PUBLIC_BASE_PATH`；自定义正式站点地址时可设置 `PUBLIC_SITE_URL`。

The default deployment base path is `/world-compiler`, which is also used by the local development server. Set `PUBLIC_BASE_PATH` for another repository name or `/` for a root deployment. Set `PUBLIC_SITE_URL` when a canonical production URL is available.

```powershell
$env:PUBLIC_BASE_PATH = "/my-repository"
$env:PUBLIC_SITE_URL = "https://example.github.io"
npm run build
```

## GitHub Pages 部署 / GitHub Pages deployment

远端仓库准备好以后：

1. 如果仓库名不是 `world-compiler`，修改 `.github/workflows/deploy.yml` 中的 `PUBLIC_BASE_PATH`。
2. 推送 `main` 分支。
3. 在 GitHub 仓库的 **Settings → Pages** 中，将来源设为 **GitHub Actions**。

After the remote repository exists:

1. If its name is not `world-compiler`, update `PUBLIC_BASE_PATH` in `.github/workflows/deploy.yml`.
2. Push the `main` branch.
3. In **Settings → Pages**, choose **GitHub Actions** as the source.

The included workflow builds with the official Astro action and deploys on pushes to `main` or by manual dispatch.

## 扩展工具 / Adding a tool

1. 在 `src/data/tools.ts` 添加一个双语 `ToolDefinition`。
2. 在 `src/pages/tools/` 新建工具页面，并复用现有布局与设计变量。
3. 把双语界面文案加入 `src/i18n/dictionaries.ts`。
4. 将核心计算保留为纯 TypeScript 模块，先写单元测试；再为用户流程补浏览器测试。
5. 图形资产放入 `public/assets/instrument-glyphs/`，生成说明保存在 `docs/assets/`。

1. Add a bilingual `ToolDefinition` in `src/data/tools.ts`.
2. Create the tool page in `src/pages/tools/`, reusing the shared layout and design tokens.
3. Add bilingual interface copy to `src/i18n/dictionaries.ts`.
4. Keep core calculations in pure TypeScript modules, cover them with unit tests first, then add a browser test for the user flow.
5. Put production graphics in `public/assets/instrument-glyphs/` and retain generation notes in `docs/assets/`.

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

配色起点来自项目方提供的参考图：`#FCA104`、`#2F6DB3`、`#E56C57`、`#5200A6`、`#CDB742`、`#45A6B2`，并扩展为适用于明暗主题的设计变量。

The palette begins with the project-provided reference colors `#FCA104`, `#2F6DB3`, `#E56C57`, `#5200A6`, `#CDB742`, and `#45A6B2`, expanded into design tokens for light and dark themes.

## License

[MIT](LICENSE) © 2026 World Compiler contributors

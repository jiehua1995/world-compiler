# 开发指南 / Development Guide

这份指南补充 [项目 README](../README.md)，说明当前实现的模块边界、图片处理流程、隐私约束、测试和发布方式。它以代码行为为准；若文档与实现不符，请先修正文档或实现，再继续开发。

This guide supplements the [project README](../README.md). It documents current module boundaries, image processing, privacy constraints, tests, and release steps. Code is the source of truth; if the guide and implementation disagree, resolve that discrepancy before extending the project.

## 1. 技术结构 / Technical structure

项目以 Astro 静态输出构建，不运行应用服务器，也没有数据库或 API。Astro 页面负责服务端生成 HTML；交互由轻量 TypeScript 模块挂载，不使用前端框架。

The project builds static output with Astro. It has no application server, database, or API. Astro generates the HTML; small TypeScript modules provide browser interactions without a frontend framework.

| 路径 / Path | 职责 / Responsibility |
| --- | --- |
| `src/pages/` | 路由：首页目录与色觉实验室 / Routes: catalog and Color Vision Lab |
| `src/layouts/BaseLayout.astro` | 文档元信息、主题预绘制、站点壳与偏好初始化 / Metadata, pre-paint theme, shared shell, preference initialization |
| `src/components/` | Astro 展示组件与工具界面组件 / Astro presentation and tool UI components |
| `src/data/tools.ts` | 工具目录唯一数据源 / Single source of truth for catalog entries |
| `src/features/` | 与页面框架分离的逻辑；色觉工具使用解码、模拟、Worker、导出模块 / Framework-independent logic; Color Vision modules handle decoding, simulation, workers, and export |
| `src/i18n/`、`src/theme/` | 语言字典、语言选择与主题解析 / Dictionaries, locale selection, theme resolution |
| `src/scripts/` | 浏览器端偏好与目录交互 / Browser-side preferences and catalog interactions |
| `src/styles/` | 设计令牌、站点壳、目录和工具样式 / Design tokens, shared shell, catalog, and tool styles |
| `tests/` | Vitest 单元/配置测试、Playwright 浏览器测试和本地图片样例 / Vitest unit/configuration tests, Playwright browser tests, and local image fixtures |
| `public/assets/` | 网站实际发布的静态资源 / Static assets shipped with the site |

## 2. 浏览器偏好 / Browser preferences

- 语言偏好保存在 `localStorage` 的 `world-compiler:locale` 键中。有效值为 `zh-CN` 和 `en`；无有效保存值时按浏览器语言选择英语或简体中文。
- 主题偏好保存在 `world-compiler:theme` 中，值为 `system`、`light` 或 `dark`。主题脚本在页面主体绘制前运行，避免初始明暗闪烁。
- 存储不可用时，当前页面仍可切换语言和主题，只是不持久保存。
- 页面标题与描述在每个 Astro 页面中提供两种语言，偏好脚本切换语言时保留当前页面自己的元信息。

- Locale preference uses the `world-compiler:locale` `localStorage` key. Valid values are `zh-CN` and `en`; without a valid saved value, browser language selects English or Simplified Chinese.
- Theme preference uses `world-compiler:theme` with `system`, `light`, or `dark`. Theme selection runs before the page body paints to avoid an initial flash.
- If storage is unavailable, language and theme still work for the current page but are not persisted.
- Each Astro page provides titles and descriptions in both languages. Locale changes preserve that page's own metadata.

## 3. 色觉实验室图片流程 / Color Vision Lab image flow

支持 PNG、JPEG、WebP 和 GIF。浏览器先校验 MIME 类型，使用 `createImageBitmap` 解码；不支持该 API 时回退至 `HTMLImageElement`。工具允许单张图片，不保留上传队列，也不将图片内容发送到网络。

Supported formats are PNG, JPEG, WebP, and GIF. The browser validates the MIME type and decodes with `createImageBitmap`, falling back to `HTMLImageElement` when needed. The workbench handles one image at a time and never sends image content over the network.

1. 文件选择或拖放进入同一个控制器。旧图片的解码资源会先清理。
2. 解码后的尺寸限制为最长边不超过 16,384 像素、总量不超过 100,000,000 像素；超限图片会被拒绝。
3. 交互预览按比例缩小到最长边 1,200 像素且总量不超过 1,200,000 像素。原图只用于最后的全尺寸导出。
4. 预览按原图、红色盲、绿色盲、蓝色盲、全色盲顺序生成。像素矩阵计算在 Web Worker 中完成；控制器只接受当前图片请求的结果，重置或换图后迟到的结果不会再绘回画布。
5. 放大预览使用原有模拟画布；导出使用原始图片尺寸和用户选择的模式，像素转换在 Worker 中执行，浏览器 Canvas 编码为 PNG 或 JPEG Blob，再触发本地下载。
6. PNG 保留透明度；JPEG 输出为不透明像素。导出完成后复用同一个本地文件名规则，不创建服务器端副本。

1. File selection and drag-and-drop enter the same controller. Resources from the previous decoded image are cleaned up first.
2. Decoded images are limited to a 16,384-pixel maximum edge and 100,000,000 total pixels. Larger images are rejected.
3. Interactive previews preserve aspect ratio and are bounded to a 1,200-pixel maximum edge and 1,200,000 total pixels. Full source dimensions are retained for export.
4. Previews are produced in this order: original, protanopia, deuteranopia, tritanopia, achromatopsia. Pixel matrix calculations run in a Web Worker. The controller accepts results only for the current image request, so a late result cannot redraw a cleared or replaced image.
5. The inspection dialog uses the existing simulated canvas. Export uses source dimensions and the selected mode; pixel conversion runs in the worker, then Canvas encodes a PNG or JPEG Blob for a local download.
6. PNG preserves transparency. JPEG output is opaque. Export uses a local filename and does not create a server-side copy.

这些矩阵是用于理解和设计审查的 sRGB 近似模拟，并不模拟个体差异，也不能用于诊断。GIF 由浏览器解码为静态图像源，当前工具不逐帧模拟动画。

The matrices are educational sRGB approximations for understanding and design review. They do not represent individual variation and are not diagnostic. GIF input is decoded as a static browser image source; animation frames are not simulated.

### 隐私边界 / Privacy boundary

图片只通过浏览器文件输入、临时对象 URL、浏览器画布和 Web Worker 流转。对象 URL 在图片被重置、替换或控制器销毁时撤销。Worker 与页面同属当前站点，没有网络上传逻辑；本项目也不加载分析或远程字体脚本。

Images flow only through the browser file input, a temporary object URL, browser canvases, and a Web Worker. The object URL is revoked when an image is reset, replaced, or the controller is destroyed. The worker belongs to the current site and has no upload path; the project does not load analytics or remote font scripts.

## 4. 新增工具 / Add a tool

1. 在 `src/data/tools.ts` 添加 `ToolDefinition`：使用唯一 slug，提供中英文标题、摘要与搜索标签，分类使用现有 `ToolCategory`。
2. 新建 `src/pages/tools/<slug>.astro`，使用 `BaseLayout`，把页面文案放进现有类型字典，复用工具页的视觉变量与公共组件。
3. 交互组件放在 `src/components/`；纯计算、输入校验和浏览器资源生命周期放在 `src/features/<slug>/`。不要把像素、文件或业务计算塞进模板。
4. 在 `tests/<feature>/` 覆盖核心逻辑、错误路径和资源清理；在 `tests/e2e/` 覆盖实际用户操作、键盘路径、窄屏和本地隐私行为。
5. 如需图形资产，发布文件放入 `public/assets/`；生成说明或源图保存在 `docs/assets/`，不要把未使用的大批生成图放进发布目录。
6. 完成后运行 `npm run verify`。若更改 Pages base path，还要检查页面链接、静态资产与 Worker 路径都以该 base 开头。

1. Add a `ToolDefinition` to `src/data/tools.ts`: use a unique slug, provide Chinese and English titles, summaries, and search tags, and choose an existing `ToolCategory`.
2. Create `src/pages/tools/<slug>.astro`, use `BaseLayout`, put interface copy in the typed dictionaries, and reuse the tool-page tokens and shared components.
3. Put interactive UI in `src/components/`; keep calculations, input validation, and browser resource lifetimes in `src/features/<slug>/`. Avoid embedding pixel, file, or business logic in templates.
4. Cover core logic, failure paths, and resource cleanup in `tests/<feature>/`; cover real user actions, keyboard paths, narrow screens, and local privacy behavior in `tests/e2e/`.
5. Put shipped graphics in `public/assets/` and generation notes/source sheets in `docs/assets/`. Keep unused generated batches out of the published asset directory.
6. Run `npm run verify`. When changing the Pages base path, confirm page links, static assets, and worker URLs all use that base.

## 5. 检查命令 / Checks

| 命令 / Command | 用途 / Purpose |
| --- | --- |
| `npm run check` | Astro 与 TypeScript 诊断 / Astro and TypeScript diagnostics |
| `npm run test:unit` | Vitest 单元和配置测试 / Vitest unit and configuration tests |
| `npm run build` | 生成静态生产站点 / Build static production output |
| `npm run test:e2e` | 使用 Chromium 打开构建产物并运行浏览器流程 / Run browser flows against the built output with Chromium |
| `npm run verify` | 按上述顺序运行全部质量门槛 / Run all checks above in order |

Playwright 使用 `http://127.0.0.1:4321/world-compiler/` 作为测试入口；配置位于 `playwright.config.ts`。浏览器测试复用本地预览服务器，故 `npm run build` 必须先完成。完整 `npm run verify` 已包含正确顺序。

Playwright uses `http://127.0.0.1:4321/world-compiler/` as its test base, configured in `playwright.config.ts`. Browser tests use the local preview server, so a build must exist first. `npm run verify` already runs these in the required order.

## 6. 构建与 GitHub Pages / Build and GitHub Pages

Astro 以静态模式输出到 `dist/`。`PUBLIC_BASE_PATH` 默认为 `/world-compiler`；GitHub Pages 项目站点必须与仓库名一致。部署工作流在 `.github/workflows/deploy.yml`：推送到 `main` 或手动触发后，先安装依赖和 Chromium，运行 `npm run verify`，再构建并发布 Pages artifact。

Astro writes static output to `dist/`. `PUBLIC_BASE_PATH` defaults to `/world-compiler`; for a GitHub Pages project site it must match the repository name. The workflow in `.github/workflows/deploy.yml` runs on pushes to `main` or manual dispatch. It installs dependencies and Chromium, runs `npm run verify`, then builds and publishes the Pages artifact.

首次连接远端仓库时：确认 Pages base path 与仓库名一致；推送 `main`；在仓库 **Settings → Pages** 中选择 **GitHub Actions**。该仓库目前只在本地开发时，部署步骤尚未在托管 GitHub Actions 环境实测。

When the remote repository is connected: make sure the Pages base path matches the repository name, push `main`, and select **GitHub Actions** in **Settings → Pages**. While the repository remains local, the workflow has not yet been exercised in hosted GitHub Actions.

## 7. 已知限制 / Known limitations

- 100 MP 上限是尺寸边界，不代表所有手机都能安全分配对应画布内存；设备能力由浏览器决定。
- Canvas 读取、写入像素和最终编码仍会使用浏览器主线程 API；大型导出即使将矩阵运算放入 Worker，也可能受画布内存和编码速度影响。
- JPEG 需要不透明输出；当前实现会把透明像素设为不透明，使用前应检查结果是否符合预期。
- 项目提供针对性键盘与响应式回归测试，不等于完整 WCAG 2.2 AA 或各类辅助技术认证。

- The 100 MP ceiling is a dimension guard, not a guarantee that every phone can allocate the corresponding canvas memory; actual limits depend on the browser and device.
- Canvas pixel read/write and final encoding still use browser APIs on the main thread. Large exports may remain constrained by canvas memory and encoder speed even though matrix calculations run in a worker.
- JPEG requires opaque output; the current implementation makes transparent pixels opaque. Check the result when transparency matters.
- The project has targeted keyboard and responsive regression tests; it has not been certified for full WCAG 2.2 AA or every assistive technology.

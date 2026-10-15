# 世界编译局 / World Compiler

一个面向公共利益的开源浏览器工具平台。它把常用但分散的小工具做成清晰、可靠、可访问的网页应用；数据默认只在浏览器中处理。

An open-source browser toolkit for the public good. It turns useful but scattered utilities into clear, reliable, accessible web apps, with data processed locally in the browser by default.

## 当前版本 / What is included

- 中、英、德三语下拉切换 / Chinese, English, and German language selector
- 浅色、深色与跟随系统主题 / Light, dark, and system themes
- 可搜索、可分类的工具目录 / Searchable, filterable tool catalog
- **色觉实验室 / Color Vision Lab**：本地导入 PNG/JPEG/WebP/GIF、SVG（最多 5 MB）或 PDF（最多 32 MB，可选页码），对照多种色觉模式。三条模拟轴可调 0–100% 强度，导出 PNG/JPEG。SVG/PDF 会先栅格化（最长边 4096 像素、最多 16 MP）；强度是模型参数，不是临床程度判断。
- **对比度透镜 / Contrast Lens**：文字排版预览、配色预设、交换颜色、AA/AAA 颜色改善建议与 JSON 报告；阈值使用未四舍五入的对比度计算。
- **清晰语言仪 / Plain Language Meter**：长句原文高亮与定位、字符/词/句/段落统计、阅读时间、词频、空白清理和报告导出。英文、德文分数为拼写启发式估算；中文提供统计。
- **数据塑形台 / Data Shaper**：导入或粘贴 CSV/TSV，重排列、命名表头、排序、去重、检查空值，导出 CSV/TSV/JSON。文件上限 10 MB、250,000 个单元格；可显式选择公式样式文本转义。
- **图像工坊 / Image Studio**：中心裁剪、缩放、旋转、翻转与 PNG/JPEG/WebP 转换；预览和文件大小比较。
- **文本对照镜 / Text Diff**：逐行或逐词比较、空白与大小写选项、差异导航与报告。
- **二维码工作台 / QR Studio**：文本/网址与 Wi-Fi 二维码、配色、纠错、留白和 PNG/SVG 导出。
- **JSON 工作台 / JSON Studio**：校验、格式化、压缩、折叠结构、文件导入与导出。
- **时间桥 / Time Bridge**：Unix 秒/毫秒和含时区 ISO 日期转换，显示六个世界时区。
- **编码实验室 / Codec Lab**：UTF-8 Base64、URL 和常见 HTML 实体转换，文本或文件 SHA-256。
- **声音实验室 / Audio Lab**：本地解码、波形预览、裁剪、增益、单声道与 16-bit WAV 导出（40 MB、10 分钟以内；输入编码取决于浏览器）。
- **配色提取台 / Palette Lab**：图片主色、数量选择、HEX 色板与 CSS/JSON 导出。
- **正则实验室 / Regex Lab**：独立 Worker 匹配与替换，1 秒超时终止，限制输入与结果体积。
- **网址工作台 / URL Lab**：结构检查、查询参数编辑、保留重复键、移除常见追踪参数、编码/解码；不自动访问输入网址。
- **单位换算台 / Unit Lab**：长度、质量、速度、数据与温度换算，含绝对零度与溢出校验。
- **随机生成器 / Token Lab**：设备加密随机数生成密码和 UUID v4；不保存输出。
- **文字工坊 / Text Workshop**：大小写、去重行、排序、修剪与文本统计。
- **流媒体工作室 / Stream Studio**：检查公开、允许 CORS 的未加密 M3U8 点播列表，按序下载为 MPEG-TS（最多 2000 段、128 MB）。不支持直播、主列表、DRM、加密、字节范围或 fMP4，不绕过登录和版权限制，不伪装成 MP4。
- **文字识别台 / OCR Studio**：中、英、德图片识别。首次显式下载本站托管的引擎与语言包；缓存后可离线识别。图片不上传，结果需人工校对。
- **PDF 整理台 / PDF Desk**：调整文件顺序、合并、按页码范围提取；最多 20 文件、64 MB、2000 页。不支持加密文件，书签、表单与签名可能丢失，请保留原件。
- **PDF 文本提取 / PDF Text Extractor**：提取已有文字层、保留分页标记并导出 TXT；扫描件请用 OCR。
- **图片转 PDF / Images to PDF**：PNG/JPEG 排序，A4、Letter 或原图尺寸，每页一图等比居中。
- **随机工坊 / Random Forge**：批量生成加密随机密码、易记短语、无重复抽奖号码、骰子点数、占位文本和中英德祝福语。小型短语词库只用于灵感，不适合作为账号密码。
- **Markdown 文档诊断 / Markdown Studio**：扫描标题层级、一级标题、链接、段落和篇幅，自动生成目录建议。
- **YAML / JSON 转换**：完整解析并转换 YAML 与 JSON，检查重复键、别名和语法。
- **XML 整理台 / XML Studio**：浏览器解析 XML、拒绝 DTD/实体声明并规范化序列化。
- **CSS 工坊 / CSS Studio**：调用浏览器 CSSOM 检查并规范化规则，或压缩可识别的样式表。
- **CSV / JSON 桥**：在带引号 CSV 与对象数组 JSON 间转换，检查重复表头和行宽；CSV 导出默认转义公式样式值。
- **颜色格式转换 / Color Converter**：HEX 与 RGB 输入，计算 HSL 并展示对应颜色。
- **渐变配方台 / Gradient Studio**：配置颜色端点和角度，预览 CSS 线性渐变并导出样式。
- **Cron 计划器 / Cron Planner**：校验标准五段表达式，解释字段并显示未来五次 UTC 时间（不包含时区扩展语法）。
- **IPv4 子网计算器**：解析 CIDR，给出掩码、网络、广播、可用主机范围和地址数量；不处理 IPv6。
- **日期计算台 / Date Math**：校验 ISO 日期，计算天数偏移、年内日序和 UTC 星期。
- **摘要与校验实验室 / Hash Studio**：对文本或最大64MB文件计算浏览器 Web Crypto 支持的 SHA-1/256/384/512。
- **UUID 工作台 / UUID Studio**：生成 UUID v4，验证 UUID 语法并查看版本与变体字段。
- **HTML 实体转换 / HTML Entities**：编码 HTML 特殊字符，或解码常见命名实体和十进制/十六进制字符引用。
- **SVG 安全整理 / SVG Optimizer**：移除脚本、事件处理器与外部引用，限制元素/尺寸并导出安全静态 SVG（5MB）。
- **图像格式转换 / Image Converter**：将浏览器可解码图片转为其实际支持的 PNG/JPEG/WebP；动画只处理第一帧，文件30MB、16MP以内，JPEG透明区域转白底。
- **Favicon Studio**：用字符和配色生成 SVG 网站图标，并提供 HTML 引用片段。
- **图像属性检查 / Image Metadata**：读取本地 MIME、文件大小、像素尺寸和宽高比；不声称提取浏览器不可见的完整 EXIF。
- **密码强度检查 / Password Audit**：本地展示长度、字符类别与粗略字符池熵估算；不是泄露库检查或破解时间预测。
- **文本整理器 / Text Formatter**：生成 URL slug、标题/句首格式，或修剪空白、去重行。
- **Markdown 表格构造器 / Markdown Table Builder**：从 CSV/TSV 生成 Markdown 表格，检查列数并转义单元格竖线。
- 独立关于页、设备本地时间观测钟、自动统计工具数量、GitHub 与 MIT 版权链接。
- 可安装 PWA，缓存应用页面与静态资源；工具内容不保存。PDF/OCR 资源需先在线下载。
- 响应式布局、键盘操作、焦点样式、减少动态效果支持 / Responsive layout, keyboard support, visible focus, and reduced-motion support
- Astro 静态构建与 GitHub Pages 自动部署配置 / Static Astro build and GitHub Pages deployment workflow

**English:** Forty-three local tools share responsive input/result/export workbenches. The latest 21 add random content, Markdown, YAML/JSON, XML, CSS, CSV/JSON, color and gradient utilities, cron and subnet calculations, date math, multi-algorithm hashes, UUID, HTML entities, safe SVG cleanup, image conversion/inspection, favicon creation, password estimation, and text formatting. Processing stays on-device; browser-native image codec support varies, and the product reports the actual output type. Streams are fetched directly from their source with CORS permission. OCR engine/language assets require an initial download from this site.

Color Vision Lab also accepts SVG (5 MB) and PDF (32 MB, with page selection). Both are rasterized to at most 4096 px per edge / 16 MP, then simulated and exported as PNG/JPEG. SVG scripts, interactive content and external references are removed. Unlock password-protected PDFs before import. PDF.js, its worker, fonts, CMaps, ICC profiles and decoders ship with the site.

**Deutsch:** Dreiundvierzig lokale Werkzeuge mit responsiven Eingabe-, Ergebnis- und Exportbereichen. Die neuesten 21 ergänzen Zufallsgeneratoren, Markdown, YAML/JSON, XML, CSS, CSV/JSON, Farben, Cron, IPv4, Datumsrechnung, Hashes, UUID, HTML-Entitäten, SVG-Bereinigung und Bildwerkzeuge. Die Bildcodec-Unterstützung hängt vom Browser ab; das tatsächliche Ausgabeformat wird geprüft. Streams benötigen CORS-Freigabe; OCR-Engine und Sprachdateien werden beim ersten Gebrauch von dieser Website geladen.

Color Vision Lab unterstützt SVG (5 MB) und PDF (32 MB, mit Seitenauswahl). Beide werden als Rasterbild mit maximal 4096 px / 16 MP simuliert und als PNG/JPEG exportiert. Externe und interaktive SVG-Inhalte werden entfernt. Passwortgeschützte PDFs vor dem Import entsperren.

以上工具均在浏览器本地处理用户输入，不要求账户、不上传内容。色觉模拟是教育性近似工具，不是医学诊断；对比度和可读性结果也不构成认证或对个人能力的判断。

All tools process user input locally in the browser: no account is required and content is not uploaded. Color-vision simulation is an educational approximation, not medical diagnosis; contrast and readability results are not certifications or judgments of individual ability.

## 安装与离线 / Install & offline

页脚的“安装应用”可在支持的浏览器中安装；不支持安装提示时使用浏览器菜单（iOS Safari：共享 → 添加到主屏幕）。需要 HTTPS 或 localhost，安装界面由浏览器决定。构建后的 `manifest.webmanifest` 和 `sw.js` 自动适配部署子路径。

The footer offers app installation in compatible browsers. Otherwise use the browser menu (iOS Safari: Share → Add to Home Screen). HTTPS or localhost is required. Installation UI is browser-dependent. The build generates base-aware `manifest.webmanifest` and `sw.js`.

应用壳与页面预缓存；大型 PDF/OCR 资源只在下载后缓存。仅缓存本站静态资源白名单，不缓存跨域流媒体、查询字符串、文件或输入。缓存可能被浏览器回收，清除站点数据会删除离线资源。更新等所有应用窗口关闭后激活，不会自动刷新正在编辑的内容。开发模式不注册 Service Worker；测试 PWA 请运行 `npm run build` 和 `npm run preview`。

The shell and routes are precached. Large PDF/OCR assets become offline-ready after download. Only allowlisted same-origin static assets are cached, never external streams, query strings, files or input. Browser eviction or clearing site data removes offline assets. Updates activate after all app windows close, without reloading open editors. Development mode does not register the worker; test PWA with a production build and preview.

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

1. 在 `src/data/tools.ts` 添加中、英、德工具条目，slug 与页面路由保持一致。
2. 在 `src/pages/tools/` 创建 Astro 页面，复用 `BaseLayout` 和现有工具页面结构。
3. 将可切换的界面文案补入 `src/i18n/dictionaries.ts`；动态生成的标签也要提供三语版本。
4. 把核心计算放在 `src/features/<tool>/`，为纯逻辑编写单元测试，再为完整操作流程编写浏览器测试。
5. 如果工具需要图形资产，将成品放入 `public/assets/instrument-glyphs/`，并将生成说明与源图放入 `docs/assets/`。

1. Add a Chinese, English, and German tool entry to `src/data/tools.ts`; keep its slug aligned with the page route.
2. Create an Astro page in `src/pages/tools/` and reuse `BaseLayout` and the existing tool-page structure.
3. Add switchable interface copy to `src/i18n/dictionaries.ts`; dynamic labels need all three locale variants too.
4. Put core calculations in `src/features/<tool>/`, cover pure logic with unit tests, then test the full user flow in a browser.
5. If the tool needs artwork, put production assets in `public/assets/instrument-glyphs/` and generation notes/source sheets in `docs/assets/`.

**Deutsch:** Werkzeugeinträge, Oberflächentexte und dynamische Statusmeldungen müssen Chinesisch, Englisch und Deutsch unterstützen. Reine Berechnungen gehören nach `src/features/<tool>/` und benötigen Unit- und Browsertests.

详细架构、图片数据流、隐私边界和排障方法见 [开发指南 / Development guide](docs/DEVELOPMENT.md)。

For architecture, image data flow, privacy boundaries, and troubleshooting, see the [Development guide](docs/DEVELOPMENT.md).

## 项目结构 / Project structure

```text
src/components/       shared interface and tool components
src/data/             catalog definitions
src/features/         framework-independent tool logic
src/i18n/             Chinese, English, and German dictionaries and locale helpers
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

Bundled library notices: [Third-party notices](public/THIRD_PARTY_NOTICES.txt).

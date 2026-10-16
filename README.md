<div align="center">
  <img src="public/pwa-icon.svg" width="112" alt="World Compiler mark" />
  <h1>世界编译局 · World Compiler</h1>
  <p><strong>把有用的工具，交还给每一个人。 / Useful tools, freely available to everyone.</strong></p>
  <p>
    <a href="https://jiehua1995.github.io/world-compiler/"><img src="https://img.shields.io/badge/在线使用-Live%20site-2F6DB3?style=for-the-badge&logo=githubpages&logoColor=white" alt="在线使用" /></a>
    <a href="https://github.com/jiehua1995/world-compiler/actions/workflows/deploy.yml"><img src="https://img.shields.io/github/actions/workflow/status/jiehua1995/world-compiler/deploy.yml?branch=main&label=build&logo=githubactions&style=for-the-badge" alt="Build status" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/jiehua1995/world-compiler?style=for-the-badge" alt="MIT License" /></a>
  </p>
  <p><a href="README.en.md">English</a> · 简体中文</p>
</div>

---

## 直接在线使用

打开 **[世界编译局工具目录](https://jiehua1995.github.io/world-compiler/tools/)**，搜索或按类别筛选后，点开任意工具即可使用。无需注册、安装或配置开发环境；大多数工具在浏览器本地即时运行。

支持中、英、德界面，可安装为 PWA。需要 OCR 或 PDF 引擎的功能会在首次使用时从本站下载所需资源；下载完成后可离线使用。浏览器是否支持安装、图片编码格式等能力取决于设备和浏览器。

### 工具一览

目前提供 **48 个独立工作台**（含兼容入口共 49 个工具页面），包括：

- **视觉与设计：** 色觉模拟、WCAG 对比度检查、配色提取、颜色转换、渐变、图片编辑与转换、SVG 清理、图标制作。
- **文本与写作：** 清晰语言分析、文本差异、Markdown 双栏实时编辑与安全预览、Unicode 检视、正则测试、HTML 实体、随机短文与祝福语。
- **数据与开发：** JSON/YAML/XML/CSV 转换、JSON Schema 推断、受限 JSONPath 查询、CSV 数据剖析、CSS 整理、Cron、IPv4 子网、日期与时区、哈希与 UUID。
- **媒体与文档：** 本地 OCR、PDF 整理与文本提取、图片转 PDF、音频裁剪、二维码、公开 M3U8 点播列表下载。

新加入的工具有：JSON Schema 推断、JSONPath 查询（属性、数组索引和通配符）、任意精度进制换算、Unicode 码位和 UTF-8 字节检视、CSV 缺失值/唯一值剖析，以及本地 robots.txt 语法检查。Markdown 表格已并入 Markdown Studio；原 `/tools/markdown-table/` 链接继续可用，会打开同一编辑器的表格插入面板。

## 隐私与使用边界

默认在当前设备的浏览器内处理输入，不需账户，也不将输入上传到应用服务器。输入不会被应用持久保存；关闭页面后由浏览器回收。PWA 只缓存本站静态资源，不缓存用户输入或跨域媒体。

少数功能需要连接外部来源才能工作：流媒体工具直接请求用户给出的公开地址，且受 CORS 和版权/访问授权限制；OCR/PDF 运行资源从本站下载。色觉模拟是教育用途的显示近似，不是诊断。密码检查仅为本地启发式估算，不查询泄露库。图片格式支持由浏览器解码器决定。各工具页会说明对应限制。

## 开源与参与

项目以 MIT License 开源，版权归 World Compiler contributors（2026）。欢迎报告问题、完善翻译、提出新工具或提交代码。新增工具需兼顾中英德文案、浏览器本地处理、输入边界、无障碍与自动化测试。

- [如何开发新工具与提交 Pull Request](CONTRIBUTING.md)
- [现有工具专业化路线图](docs/TOOL-QUALITY-ROADMAP.md)
- [开发架构与本地命令](docs/DEVELOPMENT.md)
- [第三方许可清单](public/THIRD_PARTY_NOTICES.txt)
- [英文 README](README.en.md)

## 本地开发（维护者）

在线使用者不需要本节。参与开发时需 Node.js 22+ 与 npm：

```bash
git clone https://github.com/jiehua1995/world-compiler.git
cd world-compiler
npm ci
npm run dev
```

提交前运行 `npm run verify`（静态检查、单元测试、生产构建与浏览器测试）。详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

<div align="center">
  <sub>世界编译局 · World Compiler — 为公共利益而造，MIT License © 2026 World Compiler contributors</sub>
</div>

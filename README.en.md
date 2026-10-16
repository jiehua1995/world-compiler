<div align="center">
  <img src="public/pwa-icon.svg" width="112" alt="World Compiler mark" />
  <h1>World Compiler · 世界编译局</h1>
  <p><strong>Useful tools, freely available to everyone.</strong></p>
  <p>
    <a href="https://jiehua1995.github.io/world-compiler/"><img src="https://img.shields.io/badge/Use%20online-Live%20site-2F6DB3?style=for-the-badge&logo=githubpages&logoColor=white" alt="Live site" /></a>
    <a href="https://github.com/jiehua1995/world-compiler/actions/workflows/deploy.yml"><img src="https://img.shields.io/github/actions/workflow/status/jiehua1995/world-compiler/deploy.yml?branch=main&label=build&logo=githubactions&style=for-the-badge" alt="Build status" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/jiehua1995/world-compiler?style=for-the-badge" alt="MIT License" /></a>
  </p>
  <p>English · <a href="README.md">简体中文</a></p>
</div>

---

## Use it online

Visit the **[World Compiler tool catalog](https://jiehua1995.github.io/world-compiler/tools/)**, search or filter by category, and open any tool in its own page. No account, installation, or developer setup is needed. Most tools run immediately in your browser.

The interface is available in Chinese, English, and German. The site can be installed as a PWA. Features that need OCR or PDF engines download their assets from this site on first use; once downloaded, they can work offline. Install prompts and supported image formats vary by device and browser.

### The toolkit

There are **49 tools**, including:

- **Vision & design:** color-vision simulation, WCAG contrast checks, palette extraction, color conversion, gradients, image editing/conversion, SVG cleanup, and favicon creation.
- **Text & writing:** plain-language analysis, text diff, Markdown diagnostics/tables, Unicode inspection, regex testing, HTML entities, random copy and greetings.
- **Data & development:** JSON/YAML/XML/CSV conversion, JSON Schema inference, bounded JSONPath queries, CSV profiling, CSS cleanup, cron, IPv4 subnets, date/time, hashes, and UUIDs.
- **Media & documents:** local OCR, PDF organization and text extraction, images to PDF, audio trimming, QR codes, and downloads of public M3U8 VOD playlists.

Recent additions include JSON Schema inference; JSONPath selection (properties, array indexes, and wildcards); arbitrary-precision base conversion; Unicode code-point and UTF-8 byte inspection; CSV missing/distinct-value profiling; and a local robots.txt syntax checker. Each tool has its own page.

## Privacy and limitations

By default, input is processed in the current browser and is not uploaded to an application server. No account is needed and the app does not persist submitted content; the browser reclaims it after the page closes. The PWA caches static site assets, not user input or cross-origin media.

A few features need network access for specific resources: the media tool requests a public URL supplied by the user and remains subject to CORS and access/copyright restrictions; OCR/PDF engines are downloaded from this site. Color-vision simulation is an educational display approximation, not a diagnosis. Password auditing is a local heuristic and does not query breach databases. Image codec support depends on the browser. Individual tool pages document their limits.

## Open source and contributions

This project is open source under the MIT License. Copyright © 2026 World Compiler contributors. Bug reports, translations, tool ideas, and code contributions are welcome. New tools should include Chinese, English, and German copy, local-first processing, input limits, accessibility, and automated tests.

- [How to build a tool and submit a pull request](CONTRIBUTING.md)
- [Architecture and local commands](docs/DEVELOPMENT.md)
- [Third-party notices](public/THIRD_PARTY_NOTICES.txt)
- [简体中文 README](README.md)

## Local development (maintainers)

End users do not need this section. Contributors need Node.js 22+ and npm:

```bash
git clone https://github.com/jiehua1995/world-compiler.git
cd world-compiler
npm ci
npm run dev
```

Run `npm run verify` before submitting changes (static checks, unit tests, production build, and browser tests). See [CONTRIBUTING.md](CONTRIBUTING.md).

---

<div align="center">
  <sub>World Compiler · 世界编译局 — Built for the public good, MIT License © 2026 World Compiler contributors</sub>
</div>

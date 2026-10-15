import type { ToolDefinition } from "./tools";
export const mediaTools: readonly ToolDefinition[] = [
  {
    slug: "stream-studio",
    category: "media",
    status: "available",
    glyph: 8,
    sequence: '018',
    title: {
      "zh-CN": "流媒体工作室",
      en: "Stream Studio",
      de: "Stream-Studio",
    },
    summary: {
      "zh-CN": "检查公开 M3U8 点播列表，本地下载未加密 TS 分段。",
      en: "Inspect public M3U8 VOD playlists and download unencrypted TS segments.",
      de: "Öffentliche M3U8-VOD-Playlists prüfen und unverschlüsselte TS-Segmente speichern.",
    },
    tags: {
      "zh-CN": ["视频", "M3U8", "下载"],
      en: ["video", "M3U8", "download"],
      de: ["Video", "M3U8", "Download"],
    },
  },
  {
    slug: "ocr-studio",
    category: "text",
    status: "available",
    glyph: 10,
    sequence: '019',
    title: { "zh-CN": "文字识别台", en: "OCR Studio", de: "OCR-Studio" },
    summary: {
      "zh-CN": "使用本地引擎识别中、英、德文图片文字。",
      en: "Recognize English, German and simplified Chinese image text locally.",
      de: "Englischen, deutschen und chinesischen Bildtext lokal erkennen.",
    },
    tags: {
      "zh-CN": ["OCR", "图片", "文字"],
      en: ["OCR", "image", "text"],
      de: ["OCR", "Bild", "Text"],
    },
  },
  {
    slug: "pdf-desk",
    category: "data",
    status: "available",
    glyph: 11,
    sequence: '020',
    title: { "zh-CN": "PDF 整理台", en: "PDF Desk", de: "PDF-Werkbank" },
    summary: {
      "zh-CN": "排序合并 PDF，按页码范围提取页面。",
      en: "Reorder and merge PDFs, or extract selected page ranges.",
      de: "PDFs sortieren, zusammenführen und Seitenbereiche extrahieren.",
    },
    tags: {
      "zh-CN": ["PDF", "合并", "拆分"],
      en: ["PDF", "merge", "extract"],
      de: ["PDF", "Zusammenführen", "Extrahieren"],
    },
  },
  {
    slug: "pdf-text",
    category: "text",
    status: "available",
    glyph: 18,
    sequence: '021',
    title: {
      "zh-CN": "PDF 文本提取",
      en: "PDF Text Extractor",
      de: "PDF-Textextraktion",
    },
    summary: {
      "zh-CN": "提取 PDF 已有文字层，保留分页标记并导出文本。",
      en: "Extract existing PDF text with page markers and save as plain text.",
      de: "Vorhandenen PDF-Text mit Seitenmarkierungen als Klartext speichern.",
    },
    tags: {
      "zh-CN": ["PDF", "文字", "提取"],
      en: ["PDF", "text", "extract"],
      de: ["PDF", "Text", "Extrahieren"],
    },
  },
  {
    slug: "image-pdf",
    category: "media",
    status: "available",
    glyph: 21,
    sequence: '022',
    title: { "zh-CN": "图片转 PDF", en: "Images to PDF", de: "Bilder zu PDF" },
    summary: {
      "zh-CN": "将 PNG 或 JPEG 按顺序排成 A4、Letter 或原图尺寸 PDF。",
      en: "Arrange PNG or JPEG images into A4, Letter or image-sized PDF pages.",
      de: "PNG- und JPEG-Bilder als PDF in A4, Letter oder Bildgröße anordnen.",
    },
    tags: {
      "zh-CN": ["图片", "PDF", "转换"],
      en: ["image", "PDF", "convert"],
      de: ["Bild", "PDF", "Konvertieren"],
    },
  },
];

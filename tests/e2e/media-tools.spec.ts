import { test, expect } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { readFile } from "node:fs/promises";
test("PDF desk merges selected pages in file order and extracts local text", async ({
  page,
}) => {
  const pdf = await PDFDocument.create(),
    font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage([400, 600]).drawText("First page", { font });
  pdf.addPage([300, 700]).drawText("Second page", { font });
  const bytes = Buffer.from(await pdf.save());
  await page.goto("tools/pdf-desk/");
  await page.locator("[data-files]").setInputFiles([
    { name: "a.pdf", mimeType: "application/pdf", buffer: bytes },
    { name: "b.pdf", mimeType: "application/pdf", buffer: bytes },
  ]);
  await page.locator("[data-range]").fill("2");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-output]")).toHaveValue(/2 pages/);
  const download = page.waitForEvent("download");
  await page.locator("[data-save]").click();
  const saved = await download;
  expect(saved.suggestedFilename()).toBe("pages.pdf");
  const merged = await PDFDocument.load(await readFile((await saved.path())!));
  expect(
    merged.getPages().map((page) => [page.getWidth(), page.getHeight()]),
  ).toEqual([
    [300, 700],
    [300, 700],
  ]);
  await page.goto("tools/pdf-text/");
  await page.locator("[data-files]").setInputFiles({
    name: "a.pdf",
    mimeType: "application/pdf",
    buffer: bytes,
  });
  await page.locator("[data-range]").fill("2");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-output]")).toHaveValue(/Second page/);
  await expect(page.locator("[data-output]")).not.toHaveValue(/First page/);
});
test("OCR downloads explicitly then recognizes locally without network", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await page.goto("tools/ocr-studio/");
  await page.locator("[data-prepare]").click();
  await expect(page.locator("[data-ready]")).toContainText(
    /cached|已缓存|gespeichert/,
    { timeout: 60000 },
  );
  await page.reload();
  await page.evaluate(() => {
    const nativeFetch = window.fetch.bind(window);
    let failPdfWorkerOnce = true;
    window.name = "0";
    window.fetch = (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.includes("pdf.worker.min")) {
        window.name = String(Number(window.name) + 1);
        if (failPdfWorkerOnce) {
          failPdfWorkerOnce = false;
          return Promise.reject(new TypeError("Failed to fetch"));
        }
      }
      return nativeFetch(input, init);
    };
  });
  await page.locator("[data-prepare]").click();
  await expect(page.locator("[data-status]")).toContainText(/处理失败/);
  await page.locator("[data-prepare]").click();
  await expect.poll(() => page.evaluate(() => window.name)).toBe("2");
  await expect(page.locator("[data-status]")).toContainText(/完成/);
  await expect(page.locator("[data-run]")).toBeEnabled();
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 160;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 900, 160);
    ctx.fillStyle = "black";
    ctx.font = "64px Arial";
    ctx.fillText("HELLO WORLD", 30, 100);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator("[data-files]").setInputFiles({
    name: "text.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await context.setOffline(true);
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-output]")).toHaveValue(/HELLO WORLD/, {
    timeout: 60000,
  });
  await expect(page.locator("[data-line-results]")).toBeVisible();
  await expect(page.locator("[data-lines] li").first()).toContainText(/HELLO WORLD[\s\S]*%/);
  await page.locator("[data-enhance]").selectOption("gray");
  await context.setOffline(true);
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-output]")).toHaveValue(/HELLO WORLD/, {
    timeout: 60000,
  });
  await page.locator("[data-enhance]").selectOption("threshold");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-output]")).toHaveValue(/HELLO WORLD/, {
    timeout: 60000,
  });
  const scan = await PDFDocument.create();
  scan.addPage([900, 160]);
  const scanPage = scan.addPage([900, 160]);
  scanPage.drawImage(await scan.embedPng(Buffer.from(png, "base64")), {
    x: 0, y: 0, width: 900, height: 160,
  });
  await page.locator("[data-files]").setInputFiles({
    name: "scan.pdf", mimeType: "application/pdf", buffer: Buffer.from(await scan.save()),
  });
  await page.locator("[data-range]").fill("2");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-status]")).toContainText(/Done|完成|Fertig/);
  await expect(page.locator("[data-output]")).toHaveValue(/Page 2[\s\S]*HELLO WORLD/, {
    timeout: 60000,
  });
  await context.setOffline(false);
  await page.locator("[data-run]").click();
  await page.locator("[data-cancel]").click();
  await expect(page.locator("[data-status]")).toContainText(
    /Cancelled|已取消|Abgebrochen/,
  );
  await expect(page.locator("[data-run]")).toBeEnabled();
});
test("stream inspector rejects live and encrypted streams, downloads plain TS", async ({
  page,
}) => {
  await page.route("https://media.example/**", (route) => {
    const url = route.request().url();
    if (url.endsWith(".ts")) {
      const packet = Buffer.alloc(188);
      packet[0] = 0x47;
      return route.fulfill({ body: packet, contentType: "video/mp2t" });
    }
    const tag = url.includes("encrypted")
      ? '#EXT-X-KEY:METHOD=AES-128,URI="key"\n'
      : "";
    return route.fulfill({
      body: `#EXTM3U\n${tag}#EXTINF:2,\npart.ts\n${url.includes("live") ? "" : "#EXT-X-ENDLIST"}`,
      contentType: "application/vnd.apple.mpegurl",
    });
  });
  await page.goto("tools/stream-studio/");
  for (const name of ["live", "encrypted"]) {
    await page.locator("[data-url]").fill(`https://media.example/${name}.m3u8`);
    await page.locator("[data-run]").click();
    await expect(page.locator("[data-status]")).toContainText(
      /unsupported|不支持|无效|Live playlists|Encrypted/,
    );
    await expect(page.locator("[data-download]")).toBeDisabled();
  }
  await page.goto("tools/stream-studio/");
  await page.locator("[data-url]").fill("https://media.example/list.m3u8");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-download]")).toBeEnabled();
  await page.locator("[data-download]").click();
  await expect(page.locator("[data-save]")).toBeEnabled();
  await expect(page.locator("[data-output]")).toHaveValue(/1 segments/);
});
test("image PDF creates one A4 page per image", async ({ page }) => {
  await page.goto("tools/image-pdf/");
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 20;
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator("[data-files]").setInputFiles([
    {
      name: "one.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    },
    {
      name: "two.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    },
  ]);
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-output]")).toHaveValue(/2 pages/);
  const pending = page.waitForEvent("download");
  await page.locator("[data-save]").click();
  const saved = await pending;
  const result = await PDFDocument.load(await readFile((await saved.path())!));
  expect(result.getPageCount()).toBe(2);
  expect(result.getPage(0).getWidth()).toBeCloseTo(595.28);
});
test("stream URL stays locked during inspection and cancellation restores it", async ({
  page,
}) => {
  await page.route(
    "https://slow.example/list.m3u8",
    () => {},
  );
  await page.goto("tools/stream-studio/");
  await page.locator("[data-url]").fill("https://slow.example/list.m3u8");
  const requested = page.waitForRequest("https://slow.example/list.m3u8");
  await page.locator("[data-run]").click();
  await requested;
  await expect(page.locator("[data-url]")).toBeDisabled();
  await page.locator("[data-cancel]").click();
  await expect(page.locator("[data-status]")).toContainText(
    /Cancelled|已取消|Abgebrochen/,
  );
  await expect(page.locator("[data-url]")).toBeEnabled();
  await expect(page.locator("[data-download]")).toBeDisabled();
});

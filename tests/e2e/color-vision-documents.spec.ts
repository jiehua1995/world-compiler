import { expect, test } from "@playwright/test";

function vectorPdf(): Buffer {
  const stream = (color: string) => {
    const content =
      color +
      " rg\n0 0 240 120 re f\n1 1 1 rg\nBT /F1 18 Tf 30 40 Td (World Compiler) Tj ET\n";
    return (
      "<< /Length " +
      Buffer.byteLength(content) +
      " >>\nstream\n" +
      content +
      "endstream"
    );
  };
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 240 120] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>",
    stream("1 0 0"),
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 240 120] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>",
    stream("0 0 1"),
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(body));
    body += index + 1 + " 0 obj\n" + object + "\nendobj\n";
  }
  const xref = Buffer.byteLength(body);
  body += "xref\n0 " + offsets.length + "\n0000000000 65535 f \n";
  body += offsets
    .slice(1)
    .map((offset) => String(offset).padStart(10, "0") + " 00000 n \n")
    .join("");
  body +=
    "trailer\n<< /Size " +
    offsets.length +
    " /Root 1 0 R >>\nstartxref\n" +
    xref +
    "\n%%EOF";
  return Buffer.from(body);
}
test("imports SVG with local styles, blocks active/external content and exports pixels", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("./tools/color-vision/");
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300" onload="window.SVG_EXECUTED=1"><style>.color{fill:#fca104}</style><script>window.SVG_EXECUTED=1</script><foreignObject><iframe src="https://svg-leak.invalid/frame"/></foreignObject><image href="https://svg-leak.invalid/image"/><rect class="color" width="600" height="300"/></svg>';
  await page
    .locator("[data-image-input]")
    .setInputFiles({
      name: "plot.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from(svg),
    });
  await expect(page.getByRole("status")).toContainText("完成");
  await expect(page.locator('[data-canvas="original"]')).toHaveAttribute(
    "width",
    "600",
  );
  const pixel = await page
    .locator('[data-canvas="original"]')
    .evaluate((canvas) =>
      Array.from(
        (canvas as HTMLCanvasElement)
          .getContext("2d")!
          .getImageData(20, 20, 1, 1).data,
      ),
    );
  expect(pixel).toEqual([252, 161, 4, 255]);
  expect(requests.some((url) => url.includes("svg-leak.invalid"))).toBe(false);
  expect(await page.evaluate(() => Object.hasOwn(window, "SVG_EXECUTED"))).toBe(
    false,
  );
  const download = page.waitForEvent("download");
  await page.locator("[data-export]").click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
  await expect(page.locator("[data-pdf-controls]")).toBeHidden();
});
test("imports a local PDF, changes page, localizes controls and exports the selected page", async ({
  page,
}) => {
  const requests: { url: string; method: string }[] = [];
  const workers: string[] = [];
  page.on("request", (request) =>
    requests.push({ url: request.url(), method: request.method() }),
  );
  page.on("worker", (worker) => workers.push(worker.url()));
  await page.goto("./tools/color-vision/");
  await page
    .locator("[data-image-input]")
    .setInputFiles({
      name: "two-pages.pdf",
      mimeType: "application/pdf",
      buffer: vectorPdf(),
    });
  await expect(page.getByRole("status")).toContainText("完成");
  await expect(page.locator("[data-pdf-count]")).toContainText("2");
  const pixel = () =>
    page
      .locator('[data-canvas="original"]')
      .evaluate((canvas) =>
        Array.from(
          (canvas as HTMLCanvasElement)
            .getContext("2d")!
            .getImageData(20, 20, 1, 1).data,
        ),
      );
  expect(await pixel()).toEqual([255, 0, 0, 255]);
  await page.locator("[data-pdf-page]").fill("2");
  await page.locator("[data-pdf-render]").click();
  await expect(page.getByRole("status")).toContainText("完成");
  expect(await pixel()).toEqual([0, 0, 255, 255]);
  await page.locator("[data-locale-select]").selectOption("de");
  await expect(
    page.getByRole("button", { name: "Seite anzeigen" }),
  ).toBeVisible();
  await expect(page.locator("[data-pdf-page]")).toHaveValue("2");
  await page.locator("[data-export-format]").selectOption("image/jpeg");
  const download = page.waitForEvent("download");
  await page.locator("[data-export]").click();
  const result = await download;
  expect(result.suggestedFilename()).toContain("page-2-");
  expect(result.suggestedFilename()).toMatch(/\.jpg$/);
  expect(workers.some((url) => url.includes("pdf.worker"))).toBe(true);
  expect(
    workers.every((url) =>
      new URL(url).pathname.startsWith("/world-compiler/"),
    ),
  ).toBe(true);
  expect(requests.every((request) => request.method === "GET")).toBe(true);
  expect(
    requests.every(
      (request) => new URL(request.url).origin === "http://127.0.0.1:4321",
    ),
  ).toBe(true);
  expect(
    requests.some((request) =>
      request.url.includes("/vendor/pdfjs/standard_fonts/"),
    ),
  ).toBe(true);
  await page.locator("[data-reset]").click();
  await expect(page.locator("[data-pdf-controls]")).toBeHidden();
});
test("rejects corrupt PDF, SVG entities and oversized documents, then recovers", async ({
  page,
}) => {
  await page.goto("./tools/color-vision/");
  const input = page.locator("[data-image-input]");
  await input.setInputFiles({
    name: "bad.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("not a pdf"),
  });
  await expect(page.getByRole("alert")).toBeVisible();
  await input.setInputFiles({
    name: "entities.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(
      '<!DOCTYPE svg [<!ENTITY x "x">]><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
    ),
  });
  await expect(page.getByRole("alert")).toBeVisible();
  await input.setInputFiles({
    name: "large.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(32000001),
  });
  await expect(page.getByRole("alert")).toContainText("32 MB");
  await input.setInputFiles({
    name: "ok.svg",
    mimeType: "application/octet-stream",
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>',
    ),
  });
  await expect(page.getByRole("status")).toContainText("完成");
});

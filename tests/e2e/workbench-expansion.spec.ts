import { expect, test } from "@playwright/test";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { tools } from '../../src/data/tools';

test("expanded catalog has distinct artwork and every released tool", async ({
  page,
}) => {
  await page.goto("./tools/");
  await expect(page.getByRole("article")).toHaveCount(tools.length);
  await expect(page.locator(".tool-card .instrument-glyph")).toHaveCount(tools.filter(tool=>tool.glyph!==undefined).length);
  await expect(page.locator(".tool-card__placeholder")).toHaveCount(0);
});
test("contrast suggestion meets target and exports report", async ({
  page,
}) => {
  await page.goto("./tools/contrast-lens/");
  await page.locator('[data-color-hex="foreground"]').fill("#aaaaaa");
  await page.locator('[data-suggest="4.5"]').click();
  const ratio = await page.locator("[data-contrast-ratio]").textContent();
  expect(parseFloat(ratio!)).toBeGreaterThanOrEqual(4.5);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载配色报告" }).click();
  expect((await download).suggestedFilename()).toContain("contrast.json");
});
test("text analysis highlights long sentences and preserves text across locales", async ({
  page,
}) => {
  await page.goto("./tools/plain-language/");
  await page.getByLabel("分析语言").selectOption("en");
  const value = Array(30).fill("word").join(" ") + ".";
  await page.getByLabel("待分析文本").fill(value);
  await expect(page.locator("[data-marked-text] mark")).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "语言", exact: true })
    .selectOption("de");
  await expect(page.locator("[data-analysis-text]")).toHaveValue(value);
  await page.locator("[data-long-list] button").click();
  await expect(page.locator("[data-analysis-text]")).toBeFocused();
});
test("table transforms sort, deduplicate and export JSON", async ({ page }) => {
  await page.goto("./tools/data-shape/");
  await page.locator("[data-data-paste]").fill("name,n\nAda,12\nLin,3\nAda,12");
  await page.locator("[data-data-read]").click();
  await page.locator("[data-deduplicate]").check();
  await page.locator("[data-sort-column]").fill("2");
  await page.locator("[data-sort-order]").selectOption("asc");
  await page.locator("[data-clean]").click();
  await expect(page.locator("[data-data-table] tr")).toHaveCount(3);
  await expect(page.locator("[data-data-table] tr").nth(1)).toContainText(
    "Lin",
  );
  await page.locator("[data-data-format]").selectOption("JSON");
  const download = page.waitForEvent("download");
  await page.locator("[data-download]").click();
  expect((await download).suggestedFilename()).toBe(
    "world-compiler-cleaned.json",
  );
});
test("text cleanup keeps a comparison and can be undone", async ({ page }) => {
  await page.goto("./tools/plain-language/");
  const original = "  One   sentence.  \n\n\n Another sentence. ";
  await page.locator("[data-analysis-text]").fill(original);
  await page.locator("[data-plain-clean]").click();
  await expect(page.locator("[data-analysis-text]")).toHaveValue(
    "One sentence.\n\nAnother sentence.",
  );
  await expect(page.locator("[data-plain-before]")).toHaveText(original);
  await page.locator("[data-plain-undo]").click();
  await expect(page.locator("[data-analysis-text]")).toHaveValue(original);
});
test("image studio transforms pixels and exports a local PNG", async ({
  page,
}) => {
  await page.goto("./tools/image-studio/");
  await page
    .locator("[data-image-file]")
    .setInputFiles(path.resolve("tests/fixtures/color-grid.png"));
  await expect(page.locator("[data-image-download]")).toBeEnabled();
  await page.locator("[data-image-crop]").selectOption("1");
  await page.locator("[data-image-width]").fill("200");
  await page.locator("[data-image-format]").selectOption("image/png");
  await expect(page.locator("[data-image-canvas]")).toHaveAttribute(
    "width",
    "200",
  );
  await expect(page.locator("[data-image-canvas]")).toHaveAttribute(
    "height",
    "200",
  );
  await expect(page.locator("[data-image-download]")).toBeEnabled();
  const download = page.waitForEvent("download");
  await page.locator("[data-image-download]").click();
  expect((await download).suggestedFilename()).toContain("-compiled.png");
});
test("image studio batch-exports a bounded local image queue", async ({
  page,
}) => {
  await page.goto("./tools/image-studio/");
  await page.locator("[data-image-file]").setInputFiles([
    { name: "first.png", mimeType: "image/png", buffer: await readFile(path.resolve("tests/fixtures/color-grid.png")) },
    { name: "second.png", mimeType: "image/png", buffer: await readFile(path.resolve("tests/fixtures/color-grid.png")) },
  ]);
  await expect(page.locator("[data-image-queue] li")).toHaveCount(2);
  await page.locator("[data-image-item-width]").nth(1).fill("80");
  await page.locator("[data-image-item-height]").nth(1).fill("60");
  await expect(page.locator("[data-image-batch-download]")).toBeEnabled();
  const downloads: string[] = [];
  page.on("download", (download) => downloads.push(download.suggestedFilename()));
  await page.locator("[data-image-batch-download]").click();
  await expect.poll(() => downloads.length).toBe(2);
  expect(downloads).toEqual(["first-1-compiled.webp", "second-2-compiled.webp"]);
  await expect(page.locator("[data-image-queue] li").nth(0)).toContainText("已导出");
  await expect(page.locator("[data-image-queue] li").nth(1)).toContainText("80 × 60 px");
  await expect(page.locator("[data-image-queue] li").nth(1)).toContainText("已导出");
  const fixture = await readFile(path.resolve("tests/fixtures/color-grid.png"));
  await page.locator("[data-image-file]").setInputFiles(Array.from({ length: 11 }, (_, index) => ({
    name: `image-${index}.png`, mimeType: "image/png", buffer: fixture,
  })));
  await expect(page.locator("[data-image-batch-download]")).toBeDisabled();
  await expect(page.locator("[data-tool-error]")).toBeVisible();
});
test("text diff renders safe content and clears stale results after editing", async ({
  page,
}) => {
  await page.goto("./tools/text-diff/");
  await page.locator("[data-diff-before]").fill("old\n<script>hello</script>");
  await page.locator("[data-diff-after]").fill("new\n<script>hello</script>");
  await page.locator("[data-diff-run]").click();
  await expect(page.locator(".diff-add")).toContainText("new");
  await expect(page.locator("[data-diff-left]")).toContainText("<script>");
  await expect(page.locator("[data-diff-download]")).toBeEnabled();
  await page.locator("[data-diff-after]").fill("changed");
  await expect(page.locator("[data-diff-download]")).toBeDisabled();
});
test("QR studio generates Wi-Fi codes, exports SVG and rejects low contrast", async ({
  page,
}) => {
  await page.goto("./tools/qr-studio/");
  await expect(page.locator("[data-qr-svg]")).toBeEnabled();
  await page.locator("[data-qr-type]").selectOption("wifi");
  await page.locator("[data-qr-ssid]").fill("World Compiler");
  await page.locator("[data-qr-password]").fill("LOCAL_SECRET");
  await expect(page.locator("[data-qr-svg]")).toBeEnabled();
  const download = page.waitForEvent("download");
  await page.locator("[data-qr-svg]").click();
  expect((await download).suggestedFilename()).toBe("world-compiler-qr.svg");
  await page.locator("[data-qr-dark]").fill("#ffffff");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("[data-qr-svg]")).toBeDisabled();
});
test("JSON studio validates, renders text safely and disables stale exports", async ({
  page,
}) => {
  await page.goto("./tools/json-studio/");
  await page
    .locator("[data-json-input]")
    .fill('{"x":"<img src=x>","list":[1,2]}');
  await page.locator("[data-json-run]").click();
  await expect(page.locator("[data-json-output]")).toContainText("<img src=x>");
  await expect(page.locator("[data-json-tree] details")).toHaveCount(2);
  await page.locator("[data-json-input]").fill("{bad");
  await expect(page.locator("[data-json-download]")).toBeDisabled();
  await page.locator("[data-json-run]").click();
  await expect(page.getByRole("alert")).toBeVisible();
});
test("time bridge converts epoch and rejects timezone-free dates", async ({
  page,
}) => {
  await page.goto("./tools/time-bridge/");
  await expect(page.locator("[data-time-iso]")).toContainText(
    "1970-01-01T00:00:00.000Z",
  );
  await page.locator("[data-time-type]").selectOption("iso");
  await page.locator("[data-time-input]").fill("2026-10-15T12:00:00+02:00");
  await expect(page.locator("[data-time-iso]")).toContainText(
    "2026-10-15T10:00:00.000Z",
  );
  await page.locator("[data-time-input]").fill("2026-10-15T12:00:00");
  await expect(page.getByRole("alert")).toBeVisible();
});
test("codec handles Unicode and SHA-256 file hashing without uploads", async ({
  page,
}) => {
  const uploads: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") uploads.push(request.url());
  });
  await page.goto("./tools/codec-lab/");
  await page.locator("[data-codec-input]").fill("世界");
  await page.locator("[data-codec-run]").click();
  await expect(page.locator("[data-codec-output]")).toHaveText("5LiW55WM");
  await page
    .locator("[data-codec-file]")
    .setInputFiles({
      name: "empty.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(""),
    });
  await expect(page.locator("[data-codec-output]")).toHaveText(
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
  expect(uploads).toEqual([]);
});
for (const slug of [
  "contrast-lens",
  "plain-language",
  "data-shape",
  "image-studio",
  "text-diff",
  "qr-studio",
  "json-studio",
  "time-bridge",
  "codec-lab",
]) {
  test(slug + " supports three locales and phone width", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("./tools/" + slug + "/");
    for (const locale of ["en", "de", "zh-CN"]) {
      await page.locator("[data-locale-select]").selectOption(locale);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}

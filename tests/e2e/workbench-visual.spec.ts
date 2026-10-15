import { expect, test } from "@playwright/test";
test("captures the catalog and upgraded workbenches for visual review", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const slug of [
    "catalog",
    "contrast-lens",
    "plain-language",
    "data-shape",
    "qr-studio",
  ]) {
    await page.goto(slug === "catalog" ? "./tools/" : "./tools/" + slug + "/");
    if (slug === "plain-language")
      await page.locator("[data-plain-sample]").click();
    if (slug === "data-shape") {
      await page.locator("[data-data-sample]").click();
      await page.locator("[data-clean]").click();
    }
    if (slug === "qr-studio")
      await expect(page.locator("[data-qr-svg]")).toBeEnabled();
    await page.screenshot({
      path: testInfo.outputPath(slug + "-light.png"),
      fullPage: true,
    });
    await page.locator('[data-theme-value="dark"]').click();
    await page.screenshot({
      path: testInfo.outputPath(slug + "-dark.png"),
      fullPage: true,
    });
    await page.locator('[data-theme-value="light"]').click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./tools/contrast-lens/");
  await page.screenshot({
    path: testInfo.outputPath("contrast-mobile.png"),
    fullPage: true,
  });
});

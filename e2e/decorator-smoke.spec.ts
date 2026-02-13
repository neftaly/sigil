import { expect, test } from "@playwright/test";

function storyUrl(id: string) {
  return `/iframe.html?id=${id}&viewMode=story`;
}

test("storybook decorator renders without uncaught errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto(storyUrl("components-inputfield--input-field"));
  await page
    .locator("#storybook-root div[tabindex]")
    .waitFor({ timeout: 10000 });

  expect(errors).toEqual([]);
});

test("xterm pane renders content", async ({ page }) => {
  await page.goto(storyUrl("charuicanvas--bordered-box-with-text"));

  // Wait for the xterm pane to appear (label + terminal rows)
  const xtermLabel = page.locator("span", { hasText: "xterm" });
  await expect(xtermLabel).toBeVisible({ timeout: 10000 });

  // xterm renders rows as divs inside .xterm-rows
  const xtermRows = page.locator(".xterm-rows");
  await expect(xtermRows).toBeVisible({ timeout: 10000 });

  // Should have visible text content (not empty)
  await expect(xtermRows).not.toBeEmpty();
});

test("three.js pane renders content", async ({ page }) => {
  await page.goto(storyUrl("charuicanvas--bordered-box-with-text"));

  // Wait for the three.js pane to appear
  const threeLabel = page.locator("span", { hasText: "three.js" });
  await expect(threeLabel).toBeVisible({ timeout: 10000 });

  // three.js renders into a canvas element
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible({ timeout: 10000 });
});

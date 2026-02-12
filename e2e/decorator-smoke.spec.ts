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

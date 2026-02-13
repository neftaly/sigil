import { expect, test } from "@playwright/test";

function storyUrl(id: string) {
  return `/iframe.html?id=${id}&viewMode=story`;
}

function getCanvas(page: import("@playwright/test").Page) {
  return page.locator("#storybook-root div[tabindex]");
}

function getGridText(page: import("@playwright/test").Page) {
  return getCanvas(page).evaluate((el) =>
    Array.from(el.children)
      .map((row) => row.textContent)
      .join("\n"),
  );
}

/** Get the width of the first row's text (length of top border). */
async function getFirstRowWidth(page: import("@playwright/test").Page) {
  const text = await getGridText(page);
  const firstRow = text.split("\n")[0];
  // Count characters that are part of the border (non-space)
  return firstRow.trimEnd().length;
}

test.describe("Drag edge cases", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(storyUrl("components-inputfield--resizable-box"));
    await getCanvas(page).waitFor({ timeout: 10000 });
  });

  test("drag past container bounds should clamp to grid edge", async ({
    page,
  }) => {
    const canvas = getCanvas(page);
    const rect = await canvas.boundingBox();
    if (!rect) {
      throw new Error("Canvas not found");
    }

    const initialWidth = await getFirstRowWidth(page);

    // Start drag inside the box
    const startX = rect.x + 30;
    const startY = rect.y + 15;
    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // Drag 200px past the right edge of the canvas
    await page.mouse.move(rect.x + rect.width + 200, startY, { steps: 5 });
    await page.mouse.up();

    // Box should have grown significantly (clamped to grid edge, not lost)
    await expect
      .poll(() => getFirstRowWidth(page))
      .toBeGreaterThan(initialWidth + 5);
  });

  test("rapid mouse jump with no intermediate steps", async ({ page }) => {
    const canvas = getCanvas(page);
    const rect = await canvas.boundingBox();
    if (!rect) {
      throw new Error("Canvas not found");
    }

    const initialWidth = await getFirstRowWidth(page);

    // Start drag inside the box
    const startX = rect.x + 30;
    const startY = rect.y + 15;
    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // Single large jump (no steps — tests that charui handles big deltas)
    await page.mouse.move(startX + 100, startY);
    await page.mouse.up();

    await expect
      .poll(() => getFirstRowWidth(page))
      .toBeGreaterThan(initialWidth + 5);
  });

  test("multiple rapid drag cycles should not leave stuck state", async ({
    page,
  }) => {
    const canvas = getCanvas(page);
    const rect = await canvas.boundingBox();
    if (!rect) {
      throw new Error("Canvas not found");
    }

    const startX = rect.x + 30;
    const startY = rect.y + 15;

    // Perform 5 rapid drag cycles
    for (let i = 0; i < 5; i++) {
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 20, startY, { steps: 3 });
      await page.mouse.up();
      await page.waitForTimeout(50);
    }

    // After all cycles, the box should not be stuck in a dragging state.
    // Verify by doing one more clean drag that works correctly.
    const widthBefore = await getFirstRowWidth(page);
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 50, startY, { steps: 5 });
    await page.mouse.up();

    await expect
      .poll(() => getFirstRowWidth(page))
      .toBeGreaterThan(widthBefore);
  });

  test("pointer up far off-screen should release cleanly", async ({ page }) => {
    const canvas = getCanvas(page);
    const rect = await canvas.boundingBox();
    if (!rect) {
      throw new Error("Canvas not found");
    }

    const startX = rect.x + 30;
    const startY = rect.y + 15;

    // Start drag
    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // Move to negative coordinates (off-screen)
    await page.mouse.move(-100, -100, { steps: 3 });
    await page.mouse.up();

    // Verify not stuck: a new drag should work
    const widthBefore = await getFirstRowWidth(page);
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 40, startY, { steps: 5 });
    await page.mouse.up();

    await expect
      .poll(() => getFirstRowWidth(page))
      .toBeGreaterThan(widthBefore);
  });

  test("diagonal drag should change both width and height", async ({
    page,
  }) => {
    const canvas = getCanvas(page);
    const rect = await canvas.boundingBox();
    if (!rect) {
      throw new Error("Canvas not found");
    }

    const text = await getGridText(page);
    const initialRows = text.split("\n").filter((r) => r.trim()).length;
    const initialWidth = await getFirstRowWidth(page);

    // Start drag at bottom-right area of the box
    const startX = rect.x + 30;
    const startY = rect.y + 15;
    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // Diagonal drag: right and down
    await page.mouse.move(startX + 60, startY + 40, { steps: 10 });
    await page.mouse.up();

    await expect
      .poll(() => getFirstRowWidth(page))
      .toBeGreaterThan(initialWidth);
    await expect
      .poll(async () => {
        const finalText = await getGridText(page);
        return finalText.split("\n").filter((r) => r.trim()).length;
      })
      .toBeGreaterThan(initialRows);
  });
});

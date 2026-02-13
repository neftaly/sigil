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

/**
 * Check if a grid row (by 0-based index) contains a cursor cell.
 * The cursor is rendered as an overlay inversion (span with background-color).
 */
function rowHasCursor(page: import("@playwright/test").Page, rowIndex: number) {
  return getCanvas(page).evaluate((el, idx) => {
    const row = el.children[idx];
    if (!row) return false;
    return Array.from(row.children).some(
      (span) => (span as HTMLElement).style.backgroundColor !== "",
    );
  }, rowIndex);
}

test.describe("Bug: click on text in unfocused input", () => {
  test("clicking text in second input should focus it", async ({ page }) => {
    await page.goto(storyUrl("components-inputfield--focus-demo"));
    await page
      .locator("#storybook-root div[tabindex]")
      .waitFor({ timeout: 10000 });

    const canvas = getCanvas(page);
    const rect = await canvas.boundingBox();
    if (!rect) {
      throw new Error("Canvas not found");
    }

    // The FocusDemo layout is 30x7:
    // Row 0: "Name:..."
    // Row 1: "┌────...┐" (first input border top)
    // Row 2: "│Name...│" (first input content - placeholder text)
    // Row 3: "└────...┘" (first input border bottom)
    // Row 4: "┌────...┐" (second input border top)
    // Row 5: "│Email..│" (second input content - placeholder text)
    // Row 6: "└────...┘" (second input border bottom)

    // Click on "Email" text in the second input (row 5, col ~5)
    const charHeight = rect.height / 7;
    const charWidth = rect.width / 30;
    // Click on the "E" of "Email" placeholder
    await page.mouse.click(rect.x + charWidth * 2, rect.y + charHeight * 5.5);

    // Second input should now be focused — cursor (inverted cell) in row 5, not row 2
    await expect.poll(() => rowHasCursor(page, 5)).toBe(true);
    expect(await rowHasCursor(page, 2)).toBe(false);
  });

  test("clicking border of second input should also focus it", async ({
    page,
  }) => {
    await page.goto(storyUrl("components-inputfield--focus-demo"));
    await page
      .locator("#storybook-root div[tabindex]")
      .waitFor({ timeout: 10000 });

    const canvas = getCanvas(page);
    const rect = await canvas.boundingBox();
    if (!rect) {
      throw new Error("Canvas not found");
    }

    const charHeight = rect.height / 7;
    const charWidth = rect.width / 30;

    // Click on the border of second input (row 4, the top border)
    await page.mouse.click(rect.x + charWidth * 5, rect.y + charHeight * 4.5);

    // Second input should be focused — cursor (inverted cell) in row 5
    await expect.poll(() => rowHasCursor(page, 5)).toBe(true);
  });
});

test.describe("Bug: click should position caret", () => {
  test("clicking on a character should move cursor to that position", async ({
    page,
  }) => {
    await page.goto(storyUrl("components-inputfield--input-field"));
    await page
      .locator("#storybook-root div[tabindex]")
      .waitFor({ timeout: 10000 });

    const canvas = getCanvas(page);
    const rect = await canvas.boundingBox();
    if (!rect) {
      throw new Error("Canvas not found");
    }

    // First, click to focus and type some text
    const charWidth = rect.width / 30;
    const charHeight = rect.height / 3;

    await page.mouse.click(rect.x + charWidth * 2, rect.y + charHeight * 1.5);
    await page.keyboard.type("hello world");
    await expect(getCanvas(page)).toContainText("hello world");

    // Now click on the 'w' in 'world' (approximately column 7, accounting for border)
    // The text starts at column 1 (inside border), so 'w' is at col 1+6 = 7
    await page.mouse.click(rect.x + charWidth * 7.5, rect.y + charHeight * 1.5);

    // Type 'X' - it should insert at the clicked position, not at the end
    await page.keyboard.type("X");

    // X should be inserted at the clicked position, not appended at end.
    await expect(canvas).toContainText("orld");
    await expect(canvas).not.toContainText("hello worldX");
  });
});

test.describe("Bug: resize pointer capture", () => {
  test("drag should continue when mouse leaves the box", async ({ page }) => {
    await page.goto(storyUrl("components-inputfield--resizable-box"));
    await page
      .locator("#storybook-root div[tabindex]")
      .waitFor({ timeout: 10000 });

    const canvas = getCanvas(page);
    const rect = await canvas.boundingBox();
    if (!rect) {
      throw new Error("Canvas not found");
    }

    const initialText = await getGridText(page);
    const [initialFirstRow] = initialText.split("\n");
    const initialWidth = initialFirstRow.trim().length;
    // Start drag inside the box
    const startX = rect.x + 30;
    const startY = rect.y + 15;
    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // Drag FAR to the right - well past the box boundary
    // Tests pointer capture: without it, once mouse leaves the box,
    // pointermove events stop going to it
    await page.mouse.move(startX + 150, startY, { steps: 10 });
    await page.mouse.up();

    // The box should have grown significantly (by ~15 chars at least)
    await expect
      .poll(async () => {
        const text = await getGridText(page);
        return text.split("\n")[0].trim().length;
      })
      .toBeGreaterThan(initialWidth + 10);
  });
});

test.describe("Bug: cursor styling", () => {
  test("hovering over input text should show text cursor", async ({ page }) => {
    await page.goto(storyUrl("components-inputfield--input-field"));
    await page
      .locator("#storybook-root div[tabindex]")
      .waitFor({ timeout: 10000 });

    const canvas = getCanvas(page);
    const rect = await canvas.boundingBox();
    if (!rect) {
      throw new Error("Canvas not found");
    }

    const charWidth = rect.width / 30;
    const charHeight = rect.height / 3;

    // Hover over the input text area (row 1, inside the border)
    await page.mouse.move(rect.x + charWidth * 5, rect.y + charHeight * 1.5);

    // Should be 'text' cursor, not 'default'
    await expect
      .poll(() => canvas.evaluate((el) => getComputedStyle(el).cursor))
      .toBe("text");
  });

  test("hovering over resize box border should show resize cursor", async ({
    page,
  }) => {
    await page.goto(storyUrl("components-inputfield--resizable-box"));
    await page
      .locator("#storybook-root div[tabindex]")
      .waitFor({ timeout: 10000 });

    const canvas = getCanvas(page);
    const rect = await canvas.boundingBox();
    if (!rect) {
      throw new Error("Canvas not found");
    }

    // Hover over the box
    await page.mouse.move(rect.x + 30, rect.y + 15);

    // Should be some resize cursor (nwse-resize, se-resize, etc.)
    await expect
      .poll(() => canvas.evaluate((el) => getComputedStyle(el).cursor))
      .toMatch(/resize|grab/);
  });
});

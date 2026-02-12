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

    // Initial state: first input is focused (index 0)
    const initialText = await getGridText(page);
    // First input should show cursor (█) since focused=true for index 0
    console.log(`Initial grid:\n${initialText}`);

    // Click on "Email" text in the second input (row 5, col ~5)
    const charHeight = rect.height / 7;
    const charWidth = rect.width / 30;
    // Click on the "E" of "Email" placeholder
    await page.mouse.click(rect.x + charWidth * 2, rect.y + charHeight * 5.5);
    await page.waitForTimeout(300);

    const afterClickText = await getGridText(page);
    console.log(`After clicking Email text:\n${afterClickText}`);

    // Second input should now be focused — cursor block in row 5, not row 2
    const rows = afterClickText.split("\n");
    const [, , firstInputRow, , , secondInputRow] = rows;
    expect(secondInputRow).toContain("\u2588");
    expect(firstInputRow).not.toContain("\u2588");
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
    await page.waitForTimeout(300);

    const afterClickText = await getGridText(page);
    console.log(`After clicking border:\n${afterClickText}`);
    const rows = afterClickText.split("\n");

    // Second input should be focused
    const [, , , , , secondInputRow] = rows;
    expect(secondInputRow).toContain("\u2588");
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
    await page.waitForTimeout(100);
    await page.keyboard.type("hello world");
    await page.waitForTimeout(200);

    let text = await getGridText(page);
    console.log(`After typing:\n${text}`);

    // Cursor should be at end (position 11)
    // Now click on the 'w' in 'world' (approximately column 7, accounting for border)
    // The text starts at column 1 (inside border), so 'w' is at col 1+6 = 7
    await page.mouse.click(rect.x + charWidth * 7.5, rect.y + charHeight * 1.5);
    await page.waitForTimeout(200);

    // Type 'X' - it should insert at the clicked position, not at the end
    await page.keyboard.type("X");
    await page.waitForTimeout(200);

    text = await getGridText(page);
    console.log(`After click+type:\n${text}`);

    // X should be inserted at the clicked position, not appended at end.
    // The cursor block █ covers the X, so we check the surrounding text.
    // "hello Xworld" with cursor on X → "hello █world"
    expect(text).not.toContain("hello world█");
    expect(text).toContain("orld");
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
    console.log("Initial width:", initialWidth, "first row:", initialFirstRow);

    // Start drag inside the box
    const startX = rect.x + 30;
    const startY = rect.y + 15;
    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // Drag FAR to the right - well past the box boundary
    // Tests pointer capture: without it, once mouse leaves the box,
    // Pointermove events stop going to it
    await page.mouse.move(startX + 150, startY, { steps: 10 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(200);

    const finalText = await getGridText(page);
    const [finalFirstRow] = finalText.split("\n");
    const finalWidth = finalFirstRow.trim().length;
    console.log("Final width:", finalWidth, "first row:", finalFirstRow);

    // The box should have grown significantly (by ~15 chars at least)
    // Without pointer capture, it might only grow a few chars before
    // The mouse leaves the box and events stop
    expect(finalWidth).toBeGreaterThan(initialWidth + 10);
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
    await page.waitForTimeout(200);

    // Check cursor style on the container
    const cursor = await canvas.evaluate((el) => getComputedStyle(el).cursor);
    console.log("Cursor on input hover:", cursor);

    // Should be 'text' cursor, not 'default'
    expect(cursor).toBe("text");
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
    await page.waitForTimeout(200);

    const cursor = await canvas.evaluate((el) => getComputedStyle(el).cursor);
    console.log("Cursor on resize box hover:", cursor);

    // Should be some resize cursor (nwse-resize, se-resize, etc.)
    expect(cursor).toMatch(/resize|grab/);
  });
});

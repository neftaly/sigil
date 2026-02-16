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

async function clickInsideCanvas(page: import("@playwright/test").Page) {
  const canvas = getCanvas(page);
  const rect = await canvas.boundingBox();
  if (!rect) {
    throw new Error("Canvas not found");
  }
  // Click in the center of the canvas to focus the input
  await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.waitForTimeout(100);
}

test.describe("InputField", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(storyUrl("components-inputfield--input-field"));
    await page
      .locator("#storybook-root div[tabindex]")
      .waitFor({ timeout: 10000 });
  });

  test("renders with placeholder and cursor when focused", async ({ page }) => {
    const text = await getGridText(page);
    // Input is focused={true} so cursor block replaces first char of placeholder
    expect(text).toContain("ype here...");
  });

  test("type into input - chars appear in DOM", async ({ page }) => {
    // Click to set charui focus on the input node
    await clickInsideCanvas(page);
    await page.keyboard.type("hello");
    await expect(getCanvas(page)).toContainText("hello");
  });

  test("arrow keys - cursor moves visually", async ({ page }) => {
    await clickInsideCanvas(page);
    await page.keyboard.type("abc");
    // Wait for "abc" to appear before pressing arrow keys
    await expect(getCanvas(page)).toContainText("abc");

    // Move left twice — wait for each to take effect by checking cursor position.
    // Cursor overlay inverts the cell it's on, so the text content stays the
    // Same but the underlying value changes. Issue each keypress sequentially
    // And give the reconciler a frame to flush.
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");

    // Type 'X' — should insert between 'a' and 'bc'
    await page.keyboard.type("X");
    await expect(getCanvas(page)).toContainText("aXbc");
  });
});

test.describe("FocusDemo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(storyUrl("components-inputfield--focus-demo"));
    await page
      .locator("#storybook-root div[tabindex]")
      .waitFor({ timeout: 10000 });
  });

  test("renders two input fields with placeholders", async ({ page }) => {
    const text = await getGridText(page);
    expect(text).toContain("Name");
    expect(text).toContain("Email");
  });

  test("click input area and type", async ({ page }) => {
    const canvas = getCanvas(page);
    const rect = await canvas.boundingBox();
    if (!rect) {
      throw new Error("Canvas not found");
    }
    // Click on the first input (row 2, inside the bordered box)
    const charHeight = rect.height / 7;
    await page.mouse.click(rect.x + 20, rect.y + charHeight * 2);
    await page.waitForTimeout(100);

    await page.keyboard.type("hello");
    await expect(getCanvas(page)).toContainText("hello");
  });
});

test.describe("ResizableBox", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(storyUrl("components-inputfield--resizable-box"));
    await page
      .locator("#storybook-root div[tabindex]")
      .waitFor({ timeout: 10000 });
  });

  test("renders initial box with text", async ({ page }) => {
    const text = await getGridText(page);
    expect(text).toContain("Drag to resize");
  });

  test("resize box by dragging - layout reflows", async ({ page }) => {
    const canvas = getCanvas(page);
    const rect = await canvas.boundingBox();
    if (!rect) {
      throw new Error("Canvas not found");
    }

    // Get initial grid text
    const initialText = await getGridText(page);
    const [initialFirstRow] = initialText.split("\n");

    // Drag from inside the box to the right
    const startX = rect.x + 50;
    const startY = rect.y + 20;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 80, startY + 40, { steps: 5 });
    await page.mouse.up();

    // Check that the box changed — first row should be wider
    await expect
      .poll(async () => {
        const newText = await getGridText(page);
        return newText.split("\n")[0].trim().length;
      })
      .toBeGreaterThan(initialFirstRow.trim().length);
  });
});

test.describe("Smoke test", () => {
  test("FocusDemo story renders correctly", async ({ page }) => {
    await page.goto(storyUrl("components-inputfield--focus-demo"));
    await page
      .locator("#storybook-root div[tabindex]")
      .waitFor({ timeout: 10000 });

    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();

    const text = await getGridText(page);
    expect(text.trim().length).toBeGreaterThan(0);
    expect(text).toContain("Name");
  });
});

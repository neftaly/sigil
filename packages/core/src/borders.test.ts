import { describe, expect, it } from "vitest";

import { createGrid, gridToString } from "./cell.ts";
import { writeBorder } from "./borders.ts";

describe("writeBorder", () => {
  it("renders a single-style border", () => {
    const grid = createGrid(5, 3);
    writeBorder(grid, 0, 0, 5, 3, "single");
    expect(gridToString(grid)).toBe(["┌───┐", "│   │", "└───┘"].join("\n"));
  });

  it("renders a double-style border", () => {
    const grid = createGrid(5, 3);
    writeBorder(grid, 0, 0, 5, 3, "double");
    expect(gridToString(grid)).toBe(["╔═══╗", "║   ║", "╚═══╝"].join("\n"));
  });

  it("renders a round-style border", () => {
    const grid = createGrid(5, 3);
    writeBorder(grid, 0, 0, 5, 3, "round");
    expect(gridToString(grid)).toBe(["╭───╮", "│   │", "╰───╯"].join("\n"));
  });

  it("renders a bold-style border", () => {
    const grid = createGrid(5, 3);
    writeBorder(grid, 0, 0, 5, 3, "bold");
    expect(gridToString(grid)).toBe(["┏━━━┓", "┃   ┃", "┗━━━┛"].join("\n"));
  });

  it("is a no-op for width < 2", () => {
    const grid = createGrid(3, 3);
    writeBorder(grid, 0, 0, 1, 3);
    expect(gridToString(grid)).toBe(["   ", "   ", "   "].join("\n"));
  });

  it("is a no-op for height < 2", () => {
    const grid = createGrid(5, 3);
    writeBorder(grid, 0, 0, 5, 1);
    expect(gridToString(grid)).toBe(["     ", "     ", "     "].join("\n"));
  });

  it("renders at an offset position", () => {
    const grid = createGrid(7, 5);
    writeBorder(grid, 1, 1, 5, 3, "single");
    expect(gridToString(grid)).toBe(
      ["       ", " ┌───┐ ", " │   │ ", " └───┘ ", "       "].join("\n"),
    );
  });

  it("clips border that extends beyond grid", () => {
    const grid = createGrid(3, 2);
    // Border starts at (1,0), width=5 extends past grid right edge
    writeBorder(grid, 1, 0, 5, 3, "single");
    expect(gridToString(grid)).toBe([" ┌─", " │ "].join("\n"));
  });

  it("applies cell style to border characters", () => {
    const grid = createGrid(4, 2);
    writeBorder(grid, 0, 0, 4, 2, "single", { fg: "#f00" });
    expect(grid[0][0].style.fg).toBe("#f00");
    expect(grid[0][1].style.fg).toBe("#f00");
    expect(grid[1][0].style.fg).toBe("#f00");
  });

  it("renders minimum 2x2 border", () => {
    const grid = createGrid(2, 2);
    writeBorder(grid, 0, 0, 2, 2, "single");
    expect(gridToString(grid)).toBe(["┌┐", "└┘"].join("\n"));
  });
});

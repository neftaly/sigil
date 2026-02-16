import { describe, expect, it } from "vitest";

import { createGrid } from "./cell.ts";
import {
  applyOverlays,
  applyOverlaysToNodeGrid,
  createOverlayState,
  removeOverlay,
  setOverlay,
} from "./overlays.ts";

describe("OverlayState", () => {
  it("starts empty with version 0", () => {
    const state = createOverlayState();
    expect(state.overlays.size).toBe(0);
    expect(state.version).toBe(0);
  });

  it("setOverlay adds and increments version", () => {
    const state = createOverlayState();
    setOverlay(state, {
      id: "test",
      priority: 0,
      ranges: [{ startRow: 0, startCol: 0, endRow: 0, endCol: 0 }],
      transform: { type: "invert" },
    });
    expect(state.overlays.size).toBe(1);
    expect(state.version).toBe(1);
  });

  it("removeOverlay removes and increments version", () => {
    const state = createOverlayState();
    setOverlay(state, {
      id: "test",
      priority: 0,
      ranges: [],
      transform: { type: "invert" },
    });
    removeOverlay(state, "test");
    expect(state.overlays.size).toBe(0);
    expect(state.version).toBe(2);
  });

  it("removeOverlay no-ops for missing id", () => {
    const state = createOverlayState();
    removeOverlay(state, "nonexistent");
    expect(state.version).toBe(0);
  });
});

describe("applyOverlays", () => {
  it("returns original grid when no overlays", () => {
    const grid = createGrid(3, 2);
    const state = createOverlayState();
    const result = applyOverlays(grid, state);
    // Same reference, no clone
    expect(result).toBe(grid);
  });

  it("inverts fg/bg for a single cell", () => {
    const grid = createGrid(3, 1);
    grid[0][1] = { char: "X", style: { fg: "#fff", bg: "#000" } };

    const state = createOverlayState();
    setOverlay(state, {
      id: "sel",
      priority: 0,
      ranges: [{ startRow: 0, startCol: 1, endRow: 0, endCol: 1 }],
      transform: { type: "invert" },
    });

    const result = applyOverlays(grid, state);
    expect(result[0][1].style.fg).toBe("#000");
    expect(result[0][1].style.bg).toBe("#fff");
    // Original unchanged
    expect(grid[0][1].style.fg).toBe("#fff");
  });

  it("uses defaults when fg/bg are undefined", () => {
    const grid = createGrid(1, 1);
    grid[0][0] = { char: "A", style: {} };

    const state = createOverlayState();
    setOverlay(state, {
      id: "sel",
      priority: 0,
      ranges: [{ startRow: 0, startCol: 0, endRow: 0, endCol: 0 }],
      transform: { type: "invert" },
    });

    const result = applyOverlays(grid, state);
    expect(result[0][0].style.fg).toBe("#000");
    expect(result[0][0].style.bg).toBe("#ccc");
  });

  it("merge transform sets style properties", () => {
    const grid = createGrid(2, 1);
    grid[0][0] = { char: "A", style: { fg: "#fff" } };

    const state = createOverlayState();
    setOverlay(state, {
      id: "err",
      priority: 0,
      ranges: [{ startRow: 0, startCol: 0, endRow: 0, endCol: 1 }],
      transform: { type: "merge", style: { underline: true, fg: "red" } },
    });

    const result = applyOverlays(grid, state);
    expect(result[0][0].style.fg).toBe("red");
    expect(result[0][0].style.underline).toBe(true);
    expect(result[0][1].style.underline).toBe(true);
  });

  it("higher priority overlays are applied last", () => {
    const grid = createGrid(1, 1);
    grid[0][0] = { char: "A", style: {} };

    const state = createOverlayState();
    setOverlay(state, {
      id: "low",
      priority: 10,
      ranges: [{ startRow: 0, startCol: 0, endRow: 0, endCol: 0 }],
      transform: { type: "merge", style: { bg: "blue" } },
    });
    setOverlay(state, {
      id: "high",
      priority: 20,
      ranges: [{ startRow: 0, startCol: 0, endRow: 0, endCol: 0 }],
      transform: { type: "merge", style: { bg: "red" } },
    });

    const result = applyOverlays(grid, state);
    expect(result[0][0].style.bg).toBe("red");
  });

  it("handles multi-row range", () => {
    const grid = createGrid(3, 3);
    const state = createOverlayState();
    setOverlay(state, {
      id: "sel",
      priority: 0,
      ranges: [{ startRow: 0, startCol: 1, endRow: 2, endCol: 1 }],
      transform: { type: "merge", style: { bg: "yellow" } },
    });

    const result = applyOverlays(grid, state);
    // Row 0: cols 1-2 (startCol to end)
    expect(result[0][0].style.bg).toBeUndefined();
    expect(result[0][1].style.bg).toBe("yellow");
    expect(result[0][2].style.bg).toBe("yellow");
    // Row 1: all cols (full row between start and end)
    expect(result[1][0].style.bg).toBe("yellow");
    expect(result[1][1].style.bg).toBe("yellow");
    expect(result[1][2].style.bg).toBe("yellow");
    // Row 2: cols 0-1 (start to endCol)
    expect(result[2][0].style.bg).toBe("yellow");
    expect(result[2][1].style.bg).toBe("yellow");
    expect(result[2][2].style.bg).toBeUndefined();
  });
});

describe("applyOverlaysToNodeGrid", () => {
  it("returns original grid when no overlays", () => {
    const grid = createGrid(3, 2);
    const state = createOverlayState();
    const result = applyOverlaysToNodeGrid(
      grid,
      { x: 5, y: 5, width: 3, height: 2 },
      state,
    );
    expect(result).toBe(grid);
  });

  it("converts global coords to local", () => {
    const grid = createGrid(3, 1);
    grid[0][0] = { char: "A", style: { fg: "#fff", bg: "#000" } };

    const state = createOverlayState();
    setOverlay(state, {
      id: "sel",
      priority: 0,
      // Global coords: row 5, col 10
      ranges: [{ startRow: 5, startCol: 10, endRow: 5, endCol: 10 }],
      transform: { type: "invert" },
    });

    // Node at (10, 5) with size 3x1 → local col 0
    const result = applyOverlaysToNodeGrid(
      grid,
      { x: 10, y: 5, width: 3, height: 1 },
      state,
    );
    expect(result[0][0].style.fg).toBe("#000");
    expect(result[0][0].style.bg).toBe("#fff");
    // Col 1 untouched
    expect(result[0][1].style.fg).toBeUndefined();
  });

  it("ignores overlays outside node bounds", () => {
    const grid = createGrid(3, 1);
    grid[0][0] = { char: "A", style: { fg: "#fff" } };

    const state = createOverlayState();
    setOverlay(state, {
      id: "far",
      priority: 0,
      ranges: [{ startRow: 0, startCol: 0, endRow: 0, endCol: 0 }],
      transform: { type: "invert" },
    });

    const result = applyOverlaysToNodeGrid(
      grid,
      { x: 50, y: 50, width: 3, height: 1 },
      state,
    );
    expect(result[0][0].style.fg).toBe("#fff");
  });
});

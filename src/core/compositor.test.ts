import { describe, expect, it } from "vitest";
import * as fc from "fast-check";

import { type Cell, type CellStyle } from "./cell.ts";
import { type Patch, compose } from "./compositor.ts";

// --- Helpers ---

function cell(char: string, style: CellStyle = {}): Cell {
  return { char, style };
}

function makePatch(
  x: number,
  y: number,
  cells: Cell[][],
  z = 0,
  clip?: { x: number; y: number; width: number; height: number },
): Patch {
  return { origin: { x, y }, cells, z, ...(clip && { clip }) };
}

// --- Arbitraries for property-based tests ---

const arbHexColor = fc
  .array(fc.constantFrom("0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"), { minLength: 6, maxLength: 6 })
  .map((arr) => `#${arr.join("")}`);

const arbCellStyle: fc.Arbitrary<CellStyle> = fc.record(
  {
    fg: arbHexColor,
    bg: arbHexColor,
    bold: fc.boolean(),
    italic: fc.boolean(),
    underline: fc.boolean(),
  },
  { requiredKeys: [] },
);

const arbNonBlankCell: fc.Arbitrary<Cell> = fc.record({
  char: fc.constantFrom("A", "B", "X", "#", "@"),
  style: arbCellStyle,
});

function arbCellGrid(
  maxW: number,
  maxH: number,
): fc.Arbitrary<Cell[][]> {
  return fc
    .record({
      w: fc.integer({ min: 1, max: maxW }),
      h: fc.integer({ min: 1, max: maxH }),
    })
    .chain(({ w, h }) =>
      fc
        .array(
          fc.array(arbNonBlankCell, { minLength: w, maxLength: w }),
          { minLength: h, maxLength: h },
        ),
    );
}

const arbDimensions = fc.record({
  width: fc.integer({ min: 1, max: 40 }),
  height: fc.integer({ min: 1, max: 20 }),
});

// --- Unit tests ---

describe("compose", () => {
  it("empty patches produces blank grid", () => {
    const grid = compose([], 5, 3);
    expect(grid).toHaveLength(3);
    for (const row of grid) {
      expect(row).toHaveLength(5);
      for (const c of row) {
        expect(c.char).toBe(" ");
        expect(c.style).toEqual({});
      }
    }
  });

  it("single patch renders at origin", () => {
    const cells = [
      [cell("A"), cell("B")],
      [cell("C"), cell("D")],
    ];
    const grid = compose([makePatch(1, 1, cells)], 5, 5);

    expect(grid[1][1].char).toBe("A");
    expect(grid[1][2].char).toBe("B");
    expect(grid[2][1].char).toBe("C");
    expect(grid[2][2].char).toBe("D");

    // Surrounding cells should be blank
    expect(grid[0][0].char).toBe(" ");
    expect(grid[0][1].char).toBe(" ");
    expect(grid[1][0].char).toBe(" ");
  });

  it("higher z patch overwrites lower z", () => {
    const lower = makePatch(0, 0, [[cell("L", { fg: "#ff0000" })]], 0);
    const upper = makePatch(0, 0, [[cell("U", { fg: "#00ff00" })]], 1);
    const grid = compose([lower, upper], 1, 1);

    expect(grid[0][0].char).toBe("U");
    expect(grid[0][0].style.fg).toBe("#00ff00");
  });

  it("patches are stable-sorted by z", () => {
    // Two patches at the same z; the one later in the array should win
    const first = makePatch(0, 0, [[cell("1", { fg: "#aaa" })]], 5);
    const second = makePatch(0, 0, [[cell("2", { fg: "#bbb" })]], 5);
    const grid = compose([first, second], 1, 1);

    // Stable sort preserves input order for equal z, so "second" comes after "first"
    expect(grid[0][0].char).toBe("2");
    expect(grid[0][0].style.fg).toBe("#bbb");
  });

  it("clip restricts rendering", () => {
    const cells = [
      [cell("A"), cell("B"), cell("C")],
      [cell("D"), cell("E"), cell("F")],
      [cell("G"), cell("H"), cell("I")],
    ];
    // Clip to only the center cell (1,1) to (2,2) exclusive
    const patch = makePatch(0, 0, cells, 0, { x: 1, y: 1, width: 1, height: 1 });
    const grid = compose([patch], 3, 3);

    // Only cell E at (1,1) should be rendered
    expect(grid[1][1].char).toBe("E");

    // Everything else should be blank
    expect(grid[0][0].char).toBe(" ");
    expect(grid[0][1].char).toBe(" ");
    expect(grid[0][2].char).toBe(" ");
    expect(grid[1][0].char).toBe(" ");
    expect(grid[1][2].char).toBe(" ");
    expect(grid[2][0].char).toBe(" ");
    expect(grid[2][1].char).toBe(" ");
    expect(grid[2][2].char).toBe(" ");
  });

  it("cells outside grid bounds are ignored", () => {
    const cells = [[cell("X")]];
    // Place at (10, 10) in a 5x5 grid -- out of bounds
    const grid = compose([makePatch(10, 10, cells)], 5, 5);

    // Should be all blank
    for (const row of grid) {
      for (const c of row) {
        expect(c.char).toBe(" ");
      }
    }
  });

  it("blank cells don't overwrite lower layers", () => {
    const lower = makePatch(0, 0, [[cell("L", { fg: "#ff0000" })]], 0);
    // Upper patch has a blank cell (space with no style)
    const upper = makePatch(0, 0, [[cell(" ")]], 1);
    const grid = compose([lower, upper], 1, 1);

    // The blank upper cell should not overwrite the lower cell
    expect(grid[0][0].char).toBe("L");
    expect(grid[0][0].style.fg).toBe("#ff0000");
  });

  it("styled space cells DO overwrite lower layers", () => {
    const lower = makePatch(0, 0, [[cell("L", { fg: "#ff0000" })]], 0);
    // Upper patch has a space with a background color -- not blank
    const upper = makePatch(0, 0, [[cell(" ", { bg: "#00ff00" })]], 1);
    const grid = compose([lower, upper], 1, 1);

    expect(grid[0][0].char).toBe(" ");
    expect(grid[0][0].style.bg).toBe("#00ff00");
  });

  it("negative origin positions are handled", () => {
    const cells = [
      [cell("A"), cell("B"), cell("C")],
    ];
    // Origin at (-1, 0): only B and C should appear at cols 0 and 1
    const grid = compose([makePatch(-1, 0, cells)], 3, 1);

    expect(grid[0][0].char).toBe("B");
    expect(grid[0][1].char).toBe("C");
    expect(grid[0][2].char).toBe(" ");
  });

  it("wide characters clipped at boundary are replaced with space", () => {
    // A wide char (CJK) that would need 2 columns
    const wideCell: Cell = { char: "\u4f60", style: { fg: "#fff" } }; // "你" is 2 cols wide
    const contCell: Cell = { char: "", style: { fg: "#fff" }, continuation: true };
    const cells = [[wideCell, contCell]];

    // Place at col 4 in a 5-wide grid. The wide char at col 4 needs col 5 for continuation
    // but col 5 is out of bounds (grid is 0-4). So the primary should become a space.
    const grid = compose([makePatch(4, 0, cells)], 5, 1);

    expect(grid[0][4].char).toBe(" ");
  });

  it("wide char clipped by clip rect is replaced with space", () => {
    const wideCell: Cell = { char: "\u4f60", style: {} };
    const contCell: Cell = { char: "", style: {}, continuation: true };
    const cells = [[wideCell, contCell]];

    // Clip only allows col 0 (width 1), but the wide char needs col 0 and 1
    const patch = makePatch(0, 0, cells, 0, { x: 0, y: 0, width: 1, height: 1 });
    const grid = compose([patch], 5, 1);

    // Wide char can't fit in clip, should be replaced with space
    expect(grid[0][0].char).toBe(" ");
  });

  it("orphaned continuation cell renders as space", () => {
    const contCell: Cell = { char: "", style: { fg: "#fff" }, continuation: true };
    const wideCell: Cell = { char: "\u4f60", style: { fg: "#fff" } };
    const cells = [[wideCell, contCell]];

    // Clip only allows col 1 (the continuation) but not col 0 (the primary)
    const patch = makePatch(0, 0, cells, 0, { x: 1, y: 0, width: 1, height: 1 });
    const grid = compose([patch], 5, 1);

    // The continuation at col 1 should render as space since primary is clipped
    expect(grid[0][1].char).toBe(" ");
  });

  it("multiple patches at different positions compose correctly", () => {
    const patchA = makePatch(0, 0, [[cell("A")]], 0);
    const patchB = makePatch(2, 0, [[cell("B")]], 0);
    const patchC = makePatch(1, 1, [[cell("C")]], 0);

    const grid = compose([patchA, patchB, patchC], 3, 2);

    expect(grid[0][0].char).toBe("A");
    expect(grid[0][1].char).toBe(" ");
    expect(grid[0][2].char).toBe("B");
    expect(grid[1][0].char).toBe(" ");
    expect(grid[1][1].char).toBe("C");
    expect(grid[1][2].char).toBe(" ");
  });
});

// --- Property-based tests ---

describe("compose: properties", () => {
  it("output dimensions always match width x height", () => {
    fc.assert(
      fc.property(
        arbDimensions,
        fc.array(
          fc.record({
            x: fc.integer({ min: -5, max: 50 }),
            y: fc.integer({ min: -5, max: 25 }),
            z: fc.integer({ min: 0, max: 10 }),
            cells: arbCellGrid(10, 5),
          }),
          { minLength: 0, maxLength: 10 },
        ),
        ({ width, height }, patchSpecs) => {
          const patches = patchSpecs.map((s) =>
            makePatch(s.x, s.y, s.cells, s.z),
          );
          const grid = compose(patches, width, height);

          expect(grid).toHaveLength(height);
          for (const row of grid) {
            expect(row).toHaveLength(width);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("single full-grid patch equals the patch cells", () => {
    fc.assert(
      fc.property(
        fc
          .record({
            w: fc.integer({ min: 1, max: 20 }),
            h: fc.integer({ min: 1, max: 10 }),
          })
          .chain(({ w, h }) =>
            fc
              .array(
                fc.array(arbNonBlankCell, { minLength: w, maxLength: w }),
                { minLength: h, maxLength: h },
              )
              .map((cells) => ({ w, h, cells })),
          ),
        ({ w, h, cells }) => {
          const patch = makePatch(0, 0, cells, 0);
          const grid = compose([patch], w, h);

          // Every cell should match the patch
          for (let row = 0; row < h; row++) {
            for (let col = 0; col < w; col++) {
              expect(grid[row][col].char).toBe(cells[row][col].char);
              expect(grid[row][col].style).toEqual(cells[row][col].style);
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("every cell in output is a valid Cell object", () => {
    fc.assert(
      fc.property(
        arbDimensions,
        fc.array(
          fc.record({
            x: fc.integer({ min: -5, max: 50 }),
            y: fc.integer({ min: -5, max: 25 }),
            z: fc.integer({ min: 0, max: 10 }),
            cells: arbCellGrid(8, 4),
          }),
          { minLength: 0, maxLength: 8 },
        ),
        ({ width, height }, patchSpecs) => {
          const patches = patchSpecs.map((s) =>
            makePatch(s.x, s.y, s.cells, s.z),
          );
          const grid = compose(patches, width, height);

          for (const row of grid) {
            for (const c of row) {
              expect(typeof c.char).toBe("string");
              expect(typeof c.style).toBe("object");
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("higher z always wins over lower z at the same position", () => {
    fc.assert(
      fc.property(
        arbDimensions,
        arbNonBlankCell,
        arbNonBlankCell,
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        ({ width, height }, lowerCell, upperCell, lowZ, zDelta) => {
          const highZ = lowZ + zDelta;
          // Place both patches at (0,0) with a single cell
          const lower = makePatch(0, 0, [[lowerCell]], lowZ);
          const upper = makePatch(0, 0, [[upperCell]], highZ);

          // Regardless of input order, higher z should win
          const grid1 = compose([lower, upper], width, height);
          const grid2 = compose([upper, lower], width, height);

          expect(grid1[0][0].char).toBe(upperCell.char);
          expect(grid2[0][0].char).toBe(upperCell.char);
        },
      ),
      { numRuns: 200 },
    );
  });
});

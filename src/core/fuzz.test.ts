import stringWidth from "string-width";
import { describe, expect, it } from "vitest";
import * as fc from "fast-check";

import {
  type Cell,
  type CellStyle,
  createGrid,
  gridToString,
  gridWidth,
  groupCells,
  styleEquals,
} from "./cell.ts";
import {
  type Database,
  addNode,
  computeLayout,
  createDatabase,
  removeNode,
} from "./database.ts";
import {
  type PointerEvent,
  createEventState,
  dispatchKeyEvent,
  dispatchPointerEvent,
  focusRelative,
  hitTest,
  releasePointerCapture,
  setFocus,
  setPointerCapture,
} from "./events.ts";
import { measureText, wrapText } from "./measure.ts";
import { applyOverlays, createOverlayState, setOverlay } from "./overlays.ts";
import { rasterize } from "./rasterize.ts";
import { applyYogaStyles } from "./yoga-styles.ts";
import type { BoxNodeProps, TextNodeProps } from "./types.ts";

// --- Arbitraries ---

const HEX_CHARS = [..."0123456789abcdef"];
const arbColor = fc
  .array(fc.constantFrom(...HEX_CHARS), { minLength: 6, maxLength: 6 })
  .map((chars) => `#${chars.join("")}`);

const arbCellStyle: fc.Arbitrary<CellStyle> = fc.record(
  {
    fg: arbColor,
    bg: arbColor,
    bold: fc.boolean(),
    italic: fc.boolean(),
    underline: fc.boolean(),
  },
  { requiredKeys: [] },
);

const arbSingleChar = fc.string({ minLength: 1, maxLength: 1 });

const arbCell: fc.Arbitrary<Cell> = fc.record({
  char: arbSingleChar,
  style: arbCellStyle,
});

function arbRow(width: number): fc.Arbitrary<Cell[]> {
  return fc.array(arbCell, { minLength: width, maxLength: width });
}

function arbGrid(maxWidth: number, maxHeight: number): fc.Arbitrary<Cell[][]> {
  return fc
    .record({
      w: fc.integer({ min: 1, max: maxWidth }),
      h: fc.integer({ min: 1, max: maxHeight }),
    })
    .chain(({ w, h }) => fc.array(arbRow(w), { minLength: h, maxLength: h }));
}

const arbGridDimensions = fc.record({
  width: fc.integer({ min: 1, max: 60 }),
  height: fc.integer({ min: 1, max: 30 }),
});

const arbFlexDirection = fc.constantFrom(
  "row" as const,
  "column" as const,
  "row-reverse" as const,
  "column-reverse" as const,
);

const arbBoxProps: fc.Arbitrary<BoxNodeProps> = fc.record(
  {
    width: fc.integer({ min: 1, max: 40 }),
    height: fc.integer({ min: 1, max: 20 }),
    flexGrow: fc.integer({ min: 0, max: 5 }),
    flexShrink: fc.integer({ min: 0, max: 5 }),
    flexDirection: arbFlexDirection,
    border: fc.boolean(),
    borderStyle: fc.constantFrom(
      "single" as const,
      "double" as const,
      "round" as const,
      "bold" as const,
      "singleDouble" as const,
      "doubleSingle" as const,
      "classic" as const,
    ),
    padding: fc.integer({ min: 0, max: 3 }),
    color: arbColor,
    backgroundColor: arbColor,
    bold: fc.boolean(),
    italic: fc.boolean(),
    underline: fc.boolean(),
    focusable: fc.boolean(),
    tabIndex: fc.integer({ min: 0, max: 10 }),
  },
  { requiredKeys: [] },
);

const arbTextContent = fc.string({ minLength: 0, maxLength: 30 });

const arbTextProps: fc.Arbitrary<TextNodeProps> = fc.record(
  {
    content: arbTextContent,
    wrap: fc.boolean(),
    color: arbColor,
    backgroundColor: arbColor,
    bold: fc.boolean(),
    italic: fc.boolean(),
    underline: fc.boolean(),
    focusable: fc.boolean(),
    tabIndex: fc.integer({ min: 0, max: 10 }),
  },
  { requiredKeys: [] },
);

interface TreeSpec {
  type: "box" | "text";
  props: BoxNodeProps | TextNodeProps;
  children: TreeSpec[];
}

const arbTreeSpec: fc.Arbitrary<TreeSpec> = fc.letrec((tie) => ({
  tree: fc.oneof(
    { depthSize: "small" },
    fc.record({
      type: fc.constant("text" as const),
      props: arbTextProps,
      children: fc.constant([] as TreeSpec[]),
    }),
    fc.record({
      type: fc.constant("box" as const),
      props: arbBoxProps,
      children: fc.array(tie("tree") as fc.Arbitrary<TreeSpec>, {
        minLength: 0,
        maxLength: 4,
      }),
    }),
  ),
})).tree;

function buildTree(
  database: Database,
  spec: TreeSpec,
  parentId: string | null,
): void {
  const id = `node_${database.nodes.size}`;
  const node = addNode(database, {
    id,
    type: spec.type,
    props: spec.props,
    parentId,
  });
  applyYogaStyles(node, spec.props);

  if (spec.type === "text") {
    const content = (spec.props as TextNodeProps).content ?? "";
    const wrapMode = (spec.props as TextNodeProps).wrap ? "wrap" : "nowrap";
    node.yogaNode.setMeasureFunc((maxWidth, widthMode) => {
      const width = widthMode === 0 ? Infinity : maxWidth;
      const measured = measureText(content, wrapMode, width);
      return { width: measured.width, height: measured.height };
    });
  }

  for (const child of spec.children) {
    buildTree(database, child, id);
  }
}

const arbPointerEventType = fc.constantFrom(
  "pointerdown" as const,
  "pointerup" as const,
  "pointermove" as const,
  "pointercancel" as const,
);

function arbPointerEvent(
  maxCol: number,
  maxRow: number,
): fc.Arbitrary<PointerEvent> {
  return fc.record({
    type: arbPointerEventType,
    col: fc.integer({ min: -1, max: maxCol + 1 }),
    row: fc.integer({ min: -1, max: maxRow + 1 }),
    button: fc.constantFrom(0, 1, 2),
    shiftKey: fc.boolean(),
  });
}

const arbOverlayTransform = fc.oneof(
  fc.constant({ type: "invert" as const }),
  arbCellStyle.map((style) => ({ type: "merge" as const, style })),
);

// --- Tests ---

describe("fuzz: rasterize pipeline", () => {
  it("grid dimensions always match requested size", () => {
    fc.assert(
      fc.property(arbTreeSpec, arbGridDimensions, (tree, { width, height }) => {
        const db = createDatabase();
        buildTree(db, tree, null);
        computeLayout(db, width, height);
        const grid = rasterize(db, width, height);

        expect(grid).toHaveLength(height);
        for (const row of grid) {
          expect(row).toHaveLength(width);
        }

        // Cleanup yoga nodes
        if (db.rootId) {
          removeNode(db, db.rootId);
        }
      }),
      { numRuns: 200 },
    );
  });

  it("every cell has a valid char and style", () => {
    fc.assert(
      fc.property(arbTreeSpec, arbGridDimensions, (tree, { width, height }) => {
        const db = createDatabase();
        buildTree(db, tree, null);
        computeLayout(db, width, height);
        const grid = rasterize(db, width, height);

        for (const row of grid) {
          for (const cell of row) {
            expect(typeof cell.char).toBe("string");
            expect(typeof cell.style).toBe("object");
            if (cell.continuation) {
              expect(cell.char).toBe("");
            }
          }
        }

        if (db.rootId) {
          removeNode(db, db.rootId);
        }
      }),
      { numRuns: 200 },
    );
  });

  it("empty database produces blank grid", () => {
    fc.assert(
      fc.property(arbGridDimensions, ({ width, height }) => {
        const db = createDatabase();
        const grid = rasterize(db, width, height);

        expect(grid).toHaveLength(height);
        for (const row of grid) {
          expect(row).toHaveLength(width);
          for (const cell of row) {
            expect(cell.char).toBe(" ");
            expect(cell.style).toEqual({});
          }
        }
      }),
      { numRuns: 50 },
    );
  });
});

describe("fuzz: overlays", () => {
  it("output grid has same dimensions as input", () => {
    fc.assert(
      fc.property(
        arbGrid(30, 15),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 5 }),
            priority: fc.integer({ min: 0, max: 100 }),
            ranges: fc.array(
              fc.record({
                startRow: fc.integer({ min: -2, max: 20 }),
                startCol: fc.integer({ min: -2, max: 35 }),
                endRow: fc.integer({ min: -2, max: 20 }),
                endCol: fc.integer({ min: -2, max: 35 }),
              }),
              { minLength: 1, maxLength: 3 },
            ),
            transform: arbOverlayTransform,
          }),
          { minLength: 0, maxLength: 5 },
        ),
        (grid, overlays) => {
          const state = createOverlayState();
          for (const overlay of overlays) {
            setOverlay(state, overlay);
          }

          const result = applyOverlays(grid, state);

          expect(result).toHaveLength(grid.length);
          for (let i = 0; i < result.length; i++) {
            expect(result[i]).toHaveLength(grid[i].length);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("empty overlay state returns same grid reference", () => {
    fc.assert(
      fc.property(arbGrid(20, 10), (grid) => {
        const state = createOverlayState();
        const result = applyOverlays(grid, state);
        expect(result).toBe(grid);
      }),
      { numRuns: 50 },
    );
  });

  it("input grid is not mutated", () => {
    fc.assert(
      fc.property(
        arbGrid(15, 8),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 3 }),
            priority: fc.integer({ min: 0, max: 10 }),
            ranges: fc.array(
              fc.record({
                startRow: fc.integer({ min: 0, max: 10 }),
                startCol: fc.integer({ min: 0, max: 20 }),
                endRow: fc.integer({ min: 0, max: 10 }),
                endCol: fc.integer({ min: 0, max: 20 }),
              }),
              { minLength: 1, maxLength: 2 },
            ),
            transform: arbOverlayTransform,
          }),
          { minLength: 1, maxLength: 3 },
        ),
        (grid, overlays) => {
          // Deep clone the input for comparison
          const snapshot = JSON.stringify(grid);

          const state = createOverlayState();
          for (const overlay of overlays) {
            setOverlay(state, overlay);
          }
          applyOverlays(grid, state);

          expect(JSON.stringify(grid)).toBe(snapshot);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("double invert restores original fg/bg when both defined", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        arbColor,
        arbColor,
        (w, h, fg, bg) => {
          const grid = createGrid(w, h);
          // Set all cells to have both fg and bg
          for (const row of grid) {
            for (let i = 0; i < row.length; i++) {
              row[i] = { char: "x", style: { fg, bg } };
            }
          }

          const state = createOverlayState();
          setOverlay(state, {
            id: "inv1",
            priority: 0,
            ranges: [
              { startRow: 0, startCol: 0, endRow: h - 1, endCol: w - 1 },
            ],
            transform: { type: "invert" },
          });

          const once = applyOverlays(grid, state);
          // After first invert: fg=bg, bg=fg
          for (const row of once) {
            for (const cell of row) {
              expect(cell.style.fg).toBe(bg);
              expect(cell.style.bg).toBe(fg);
            }
          }

          // Apply invert again to the result
          const state2 = createOverlayState();
          setOverlay(state2, {
            id: "inv2",
            priority: 0,
            ranges: [
              { startRow: 0, startCol: 0, endRow: h - 1, endCol: w - 1 },
            ],
            transform: { type: "invert" },
          });
          const twice = applyOverlays(once, state2);

          for (const row of twice) {
            for (const cell of row) {
              expect(cell.style.fg).toBe(fg);
              expect(cell.style.bg).toBe(bg);
            }
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});

describe("fuzz: events", () => {
  it("random event sequences never crash", () => {
    fc.assert(
      fc.property(
        arbTreeSpec,
        arbGridDimensions,
        fc.array(arbPointerEvent(60, 30), { minLength: 1, maxLength: 30 }),
        (tree, { width, height }, events) => {
          const db = createDatabase();
          buildTree(db, tree, null);
          computeLayout(db, width, height);
          const state = createEventState();

          for (const event of events) {
            dispatchPointerEvent(db, state, event);
          }

          // State should be consistent
          if (state.focusedId !== null) {
            expect(db.nodes.has(state.focusedId)).toBe(true);
          }

          if (db.rootId) {
            removeNode(db, db.rootId);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("hitTest returns node containing the query point", () => {
    fc.assert(
      fc.property(
        arbTreeSpec,
        arbGridDimensions,
        fc.integer({ min: -5, max: 65 }),
        fc.integer({ min: -5, max: 35 }),
        (tree, { width, height }, col, row) => {
          const db = createDatabase();
          buildTree(db, tree, null);
          computeLayout(db, width, height);

          const hit = hitTest(db, col, row);
          if (hit?.bounds) {
            expect(col).toBeGreaterThanOrEqual(hit.bounds.x);
            expect(col).toBeLessThan(hit.bounds.x + hit.bounds.width);
            expect(row).toBeGreaterThanOrEqual(hit.bounds.y);
            expect(row).toBeLessThan(hit.bounds.y + hit.bounds.height);
          }

          if (db.rootId) {
            removeNode(db, db.rootId);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("focusRelative wraps around focusable nodes", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 8 }),
        fc.array(fc.constantFrom(1 as const, -1 as const), {
          minLength: 1,
          maxLength: 20,
        }),
        (numNodes, directions) => {
          const db = createDatabase();
          const root = addNode(db, {
            id: "root",
            type: "box",
            props: { width: 80, height: 24 },
            parentId: null,
          });
          applyYogaStyles(root, root.props);

          for (let i = 0; i < numNodes; i++) {
            const node = addNode(db, {
              id: `n${i}`,
              type: "box",
              props: { focusable: true, tabIndex: i, width: 10, height: 1 },
              parentId: "root",
            });
            applyYogaStyles(node, node.props);
          }

          computeLayout(db, 80, 24);
          const state = createEventState();

          for (const dir of directions) {
            focusRelative(db, state, dir);
            // Focus should always land on a valid node
            expect(state.focusedId).not.toBeNull();
            expect(db.nodes.has(state.focusedId!)).toBe(true);
            expect(db.nodes.get(state.focusedId!)!.props.focusable).toBe(true);
          }

          removeNode(db, "root");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("random key events never crash", () => {
    fc.assert(
      fc.property(
        arbTreeSpec,
        arbGridDimensions,
        fc.array(
          fc.record({
            type: fc.constantFrom("keydown" as const, "keyup" as const),
            key: fc.constantFrom(
              "a",
              "b",
              "Tab",
              "Enter",
              "Backspace",
              "ArrowLeft",
              "ArrowRight",
            ),
            code: fc.constant(""),
            ctrlKey: fc.boolean(),
            shiftKey: fc.boolean(),
            altKey: fc.boolean(),
            metaKey: fc.boolean(),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (tree, { width, height }, events) => {
          const db = createDatabase();
          buildTree(db, tree, null);
          computeLayout(db, width, height);
          const state = createEventState();

          // Focus something first
          if (db.nodes.size > 0) {
            const firstId = db.nodes.keys().next().value as string;
            setFocus(db, state, firstId);
          }

          for (const event of events) {
            dispatchKeyEvent(db, state, event);
          }

          if (db.rootId) {
            removeNode(db, db.rootId);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("capture routes events to captured node", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 6 }),
        fc.array(arbPointerEvent(80, 24), { minLength: 1, maxLength: 10 }),
        (numNodes, events) => {
          const db = createDatabase();
          const root = addNode(db, {
            id: "root",
            type: "box",
            props: { width: 80, height: 24 },
            parentId: null,
          });
          applyYogaStyles(root, root.props);

          for (let i = 0; i < numNodes; i++) {
            const node = addNode(db, {
              id: `n${i}`,
              type: "box",
              props: { width: 10, height: 3 },
              parentId: "root",
            });
            applyYogaStyles(node, node.props);
          }

          computeLayout(db, 80, 24);
          const state = createEventState();

          // Capture to a specific node
          setPointerCapture(state, "n0");
          expect(state.capturedNodeId).toBe("n0");

          // Dispatch events — should not crash even with capture active
          for (const event of events) {
            dispatchPointerEvent(db, state, event);
          }

          releasePointerCapture(state);
          expect(state.capturedNodeId).toBeNull();

          removeNode(db, "root");
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("fuzz: measure / wrapText", () => {
  it("wrapText always returns at least one line", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }),
        fc.integer({ min: 1, max: 80 }),
        (text, maxWidth) => {
          const lines = wrapText(text, maxWidth);
          expect(lines.length).toBeGreaterThanOrEqual(1);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("wrapText preserves all non-whitespace content", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 40 }),
        fc.integer({ min: 1, max: 60 }),
        (text, maxWidth) => {
          const lines = wrapText(text, maxWidth);
          // All non-whitespace chars from input appear in output
          const inputChars = text.replace(/\s+/g, "");
          const outputChars = lines.join("").replace(/\s+/g, "");
          expect(outputChars).toBe(inputChars);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("measureText height matches wrapText line count", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 40 }),
        fc.integer({ min: 1, max: 60 }),
        (text, maxWidth) => {
          const measured = measureText(text, "wrap", maxWidth);
          const lines = wrapText(text, maxWidth);
          expect(measured.height).toBe(lines.length);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("nowrap measureText always has height 1", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 1, max: 80 }),
        (text, maxWidth) => {
          const measured = measureText(text, "nowrap", maxWidth);
          expect(measured.height).toBe(1);
          expect(measured.width).toBe(stringWidth(text));
        },
      ),
      { numRuns: 200 },
    );
  });

  it("each wrapped line respects maxWidth (except oversized words)", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 40 }),
        fc.integer({ min: 1, max: 60 }),
        (text, maxWidth) => {
          const lines = wrapText(text, maxWidth);
          for (const line of lines) {
            const w = stringWidth(line);
            if (w > maxWidth) {
              // Only acceptable if the line is a single word that can't be split
              expect(line.trim().includes(" ")).toBe(false);
            }
          }
        },
      ),
      { numRuns: 500 },
    );
  });
});

describe("fuzz: groupCells", () => {
  it("spans cover all non-continuation cells", () => {
    fc.assert(
      fc.property(fc.array(arbCell, { minLength: 1, maxLength: 40 }), (row) => {
        const spans = groupCells(row);
        // Concatenate all span texts
        const spanText = spans.map((s) => s.text).join("");
        // Concatenate all non-continuation cell chars
        const cellText = row
          .filter((c) => !c.continuation)
          .map((c) => c.char)
          .join("");
        expect(spanText).toBe(cellText);
      }),
      { numRuns: 500 },
    );
  });

  it("spans are in ascending column order", () => {
    fc.assert(
      fc.property(fc.array(arbCell, { minLength: 2, maxLength: 40 }), (row) => {
        const spans = groupCells(row);
        for (let i = 1; i < spans.length; i++) {
          expect(spans[i].col).toBeGreaterThan(spans[i - 1].col);
        }
      }),
      { numRuns: 500 },
    );
  });

  it("cells within a span have equal styles", () => {
    fc.assert(
      fc.property(fc.array(arbCell, { minLength: 1, maxLength: 40 }), (row) => {
        const spans = groupCells(row);
        for (const span of spans) {
          // Each char in the span should match the style at span.col
          const expectedStyle = row[span.col].style;
          for (let offset = 0; offset < span.text.length; offset++) {
            // Find the actual cell index (skip continuations)
            let cellIndex = span.col;
            let charsFound = 0;
            while (charsFound < offset) {
              cellIndex++;
              if (!row[cellIndex]?.continuation) {
                charsFound++;
              }
            }
            if (row[cellIndex]) {
              expect(styleEquals(row[cellIndex].style, expectedStyle)).toBe(
                true,
              );
            }
          }
        }
      }),
      { numRuns: 200 },
    );
  });
});

describe("fuzz: createGrid / gridToString", () => {
  it("createGrid produces exact dimensions", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (width, height) => {
          const grid = createGrid(width, height);
          expect(grid).toHaveLength(height);
          for (const row of grid) {
            expect(row).toHaveLength(width);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("createGrid cells are all blank spaces", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 1, max: 30 }),
        (width, height) => {
          const grid = createGrid(width, height);
          for (const row of grid) {
            for (const cell of row) {
              expect(cell.char).toBe(" ");
              expect(cell.style).toEqual({});
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("gridToString produces correct number of lines", () => {
    fc.assert(
      fc.property(arbGrid(30, 15), (grid) => {
        const str = gridToString(grid);
        const lines = str.split("\n");
        expect(lines).toHaveLength(grid.length);
      }),
      { numRuns: 200 },
    );
  });

  it("gridWidth matches first row length", () => {
    fc.assert(
      fc.property(arbGrid(30, 15), (grid) => {
        expect(gridWidth(grid)).toBe(grid[0]?.length ?? 0);
      }),
      { numRuns: 200 },
    );
  });

  it("gridWidth of empty grid is 0", () => {
    expect(gridWidth([])).toBe(0);
  });
});

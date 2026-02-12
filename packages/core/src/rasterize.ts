import stringWidth from "string-width";

import { type Cell, type CellStyle, createGrid } from "./cell.ts";
import type { Database, LayoutNode } from "./database.ts";
import { type BorderStyle, writeBorder } from "./borders.ts";
import { wrapText } from "./measure.ts";
import type { BoxNodeProps, TextNodeProps } from "./types.ts";

/** Write a character to the grid, respecting bounds clipping. */
function writeChar(
  grid: Cell[][],
  row: number,
  col: number,
  char: string,
  style: CellStyle,
  clipBounds: { x: number; y: number; w: number; h: number },
) {
  if (
    row < clipBounds.y ||
    row >= clipBounds.y + clipBounds.h ||
    col < clipBounds.x ||
    col >= clipBounds.x + clipBounds.w
  ) {
    return;
  }

  const gridHeight = grid.length;
  const gridWidth = grid[0]?.length ?? 0;
  if (row >= 0 && row < gridHeight && col >= 0 && col < gridWidth) {
    const existing = grid[row][col];
    const merged =
      existing.style.bg && !style.bg
        ? { ...style, bg: existing.style.bg }
        : style;
    grid[row][col] = { char, style: merged };
  }
}

/** Mark continuation cells for wide (CJK) characters. */
function writeContinuationCells(
  grid: Cell[][],
  row: number,
  col: number,
  charWidth: number,
  style: CellStyle,
  clipBounds: { x: number; y: number; w: number; h: number },
) {
  if (charWidth <= 1) {
    return;
  }
  const gridHeight = grid.length;
  const gridWidth = grid[0]?.length ?? 0;
  for (let offset = 1; offset < charWidth; offset++) {
    const contCol = col + offset;
    if (
      contCol >= clipBounds.x &&
      contCol < clipBounds.x + clipBounds.w &&
      row >= 0 &&
      row < gridHeight &&
      contCol >= 0 &&
      contCol < gridWidth
    ) {
      const existing = grid[row][contCol];
      const merged =
        existing.style.bg && !style.bg
          ? { ...style, bg: existing.style.bg }
          : style;
      grid[row][contCol] = { char: "", style: merged, continuation: true };
    }
  }
}

/** Write a string of characters, handling wide (CJK) characters. */
function writeString(
  grid: Cell[][],
  row: number,
  startCol: number,
  text: string,
  style: CellStyle,
  clipBounds: { x: number; y: number; w: number; h: number },
) {
  let col = startCol;
  for (const char of text) {
    const charWidth = stringWidth(char);
    if (charWidth === 0) {
      // Zero-width char (combining mark, etc.)
    } else {
      writeChar(grid, row, col, char, style, clipBounds);
      writeContinuationCells(grid, row, col, charWidth, style, clipBounds);
      col += charWidth;
    }
  }
}

/**
 * Render a single node's visual content into a grid.
 * Does NOT recurse into children.
 */
function renderNodeContent(
  grid: Cell[][],
  node: LayoutNode,
  offsetX: number,
  offsetY: number,
) {
  const { bounds } = node;
  if (!bounds) {
    return;
  }

  const { props } = node;
  const style: CellStyle = {};
  if (props.color) {
    style.fg = props.color;
  }
  if (props.backgroundColor) {
    style.bg = props.backgroundColor;
  }
  if (props.bold) {
    style.bold = true;
  }
  if (props.italic) {
    style.italic = true;
  }
  if (props.underline) {
    style.underline = true;
  }

  const x = bounds.x + offsetX;
  const y = bounds.y + offsetY;

  // Fill background color across the node's entire bounds
  if (style.bg) {
    const gridHeight = grid.length;
    const gridWidth = grid[0]?.length ?? 0;
    for (let row = y; row < y + bounds.h; row++) {
      for (let col = x; col < x + bounds.w; col++) {
        if (row >= 0 && row < gridHeight && col >= 0 && col < gridWidth) {
          grid[row][col] = { char: " ", style: { bg: style.bg } };
        }
      }
    }
  }

  if (node.type === "box") {
    const boxProps = props as BoxNodeProps;
    if (boxProps.border) {
      const borderStyle = (boxProps.borderStyle as BorderStyle) ?? "single";
      writeBorder(grid, x, y, bounds.w, bounds.h, borderStyle, style);
    }
  }

  if (node.type === "text") {
    const textProps = props as TextNodeProps;
    const text = textProps.content ?? "";
    const wrapMode = textProps.wrap ? "wrap" : "nowrap";
    const clipBounds = { x, y, w: bounds.w, h: bounds.h };

    if (wrapMode === "wrap") {
      const lines = wrapText(text, bounds.w);
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        writeString(
          grid,
          y + lineIndex,
          x,
          lines[lineIndex],
          style,
          clipBounds,
        );
      }
    } else {
      writeString(grid, y, x, text, style, clipBounds);
    }
  }
}

function rasterizeNode(grid: Cell[][], database: Database, node: LayoutNode) {
  renderNodeContent(grid, node, 0, 0);

  for (const childId of node.childIds) {
    const child = database.nodes.get(childId);
    if (child) {
      rasterizeNode(grid, database, child);
    }
  }
}

/**
 * Rasterize a single node into its own grid (bounds.w x bounds.h).
 * Does NOT include children. Coordinates are relative to the node's origin.
 * Returns null if the node has no bounds.
 */
export function rasterizeOne(
  database: Database,
  nodeId: string,
): Cell[][] | null {
  const node = database.nodes.get(nodeId);
  if (!node?.bounds) {
    return null;
  }
  const { w, h } = node.bounds;
  const grid = createGrid(w, h);
  renderNodeContent(grid, node, -node.bounds.x, -node.bounds.y);
  return grid;
}

export function rasterize(
  database: Database,
  width: number,
  height: number,
): Cell[][] {
  const grid = createGrid(width, height);

  if (database.rootId) {
    const root = database.nodes.get(database.rootId);
    if (root) {
      rasterizeNode(grid, database, root);
    }
  }

  return grid;
}

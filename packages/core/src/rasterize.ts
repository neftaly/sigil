import stringWidth from "string-width";

import { type Cell, type CellStyle, createGrid, gridWidth } from "./cell.ts";
import type { Bounds, Database, LayoutNode } from "./database.ts";
import { writeBorder } from "./borders.ts";
import { wrapText } from "./measure.ts";
import type { BoxNodeProps, NodeProps, TextNodeProps } from "./types.ts";

/** Preserve existing background color when the new style has none. */
function mergeWithExistingBg(existing: CellStyle, style: CellStyle): CellStyle {
  return existing.bg && !style.bg ? { ...style, bg: existing.bg } : style;
}

/** Write a character to the grid, respecting bounds clipping. */
function writeChar(
  grid: Cell[][],
  row: number,
  col: number,
  char: string,
  style: CellStyle,
  clipBounds: Bounds,
) {
  if (
    row < clipBounds.y ||
    row >= clipBounds.y + clipBounds.height ||
    col < clipBounds.x ||
    col >= clipBounds.x + clipBounds.width
  ) {
    return;
  }

  const gh = grid.length;
  const gw = gridWidth(grid);
  if (row >= 0 && row < gh && col >= 0 && col < gw) {
    const merged = mergeWithExistingBg(grid[row][col].style, style);
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
  clipBounds: Bounds,
) {
  if (charWidth <= 1) {
    return;
  }
  const gh = grid.length;
  const gw = gridWidth(grid);
  for (let offset = 1; offset < charWidth; offset++) {
    const contCol = col + offset;
    if (
      contCol >= clipBounds.x &&
      contCol < clipBounds.x + clipBounds.width &&
      row >= 0 &&
      row < gh &&
      contCol >= 0 &&
      contCol < gw
    ) {
      const merged = mergeWithExistingBg(grid[row][contCol].style, style);
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
  clipBounds: Bounds,
) {
  let col = startCol;
  for (const char of text) {
    const charWidth = stringWidth(char);
    if (charWidth === 0) {
      continue;
    }
    writeChar(grid, row, col, char, style, clipBounds);
    writeContinuationCells(grid, row, col, charWidth, style, clipBounds);
    col += charWidth;
  }
}

function buildCellStyle(props: NodeProps): CellStyle {
  return {
    ...(props.color && { fg: props.color }),
    ...(props.backgroundColor && { bg: props.backgroundColor }),
    ...(props.bold && { bold: true }),
    ...(props.italic && { italic: true }),
    ...(props.underline && { underline: true }),
  };
}

/**
 * Render a single node's visual content into a grid.
 * Does NOT recurse into children.
 */
function renderNodeContent(
  grid: Cell[][],
  node: LayoutNode,
  originX = 0,
  originY = 0,
) {
  const { bounds } = node;
  if (!bounds) {
    return;
  }

  const { props } = node;
  const style = buildCellStyle(props);

  const x = bounds.x + originX;
  const y = bounds.y + originY;

  // Fill background color across the node's entire bounds
  if (style.bg) {
    const gh = grid.length;
    const gw = gridWidth(grid);
    for (let row = y; row < y + bounds.height; row++) {
      for (let col = x; col < x + bounds.width; col++) {
        if (row >= 0 && row < gh && col >= 0 && col < gw) {
          grid[row][col] = { char: " ", style: { bg: style.bg } };
        }
      }
    }
  }

  if (node.type === "box") {
    const boxProps = props as BoxNodeProps;
    if (boxProps.border) {
      const borderStyle = boxProps.borderStyle ?? "single";
      writeBorder(grid, x, y, bounds.width, bounds.height, borderStyle, style);
    }
  }

  if (node.type === "text") {
    const textProps = props as TextNodeProps;
    const text = textProps.content ?? "";
    const wrapMode = textProps.wrap ? "wrap" : "nowrap";
    const clipBounds = { x, y, width: bounds.width, height: bounds.height };

    if (wrapMode === "wrap") {
      const lines = wrapText(text, bounds.width);
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
  renderNodeContent(grid, node);

  for (const childId of node.childIds) {
    const child = database.nodes.get(childId);
    if (child) {
      rasterizeNode(grid, database, child);
    }
  }
}

/**
 * Rasterize a single node into its own grid (bounds.width x bounds.height).
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
  const { width, height } = node.bounds;
  const grid = createGrid(width, height);
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

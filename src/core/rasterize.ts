import stringWidth from "string-width";

import { type Cell, type CellStyle, createGrid, gridWidth } from "./cell.ts";
import type { Patch } from "./compositor.ts";
import type { Bounds, Database, LayoutNode } from "./database.ts";
import { writeBorder } from "./borders.ts";
import { wrapText } from "./measure.ts";
import type { BoxNodeProps, LayoutProps, NodeProps, StyledRun, TextNodeProps } from "./types.ts";

/** Dim foreground color applied to disabled nodes. */
const DISABLED_FG = "#888888";

/** Check if a node has display: "none". */
function isDisplayNone(props: NodeProps): boolean {
  const lp = props as Partial<LayoutProps>;
  return lp.display === "none";
}

/** Check if a node is disabled. */
function isDisabled(props: NodeProps): boolean {
  const bp = props as Partial<BoxNodeProps>;
  return bp.disabled === true;
}

/** Apply dim styling to all cells within the given bounds on the grid. */
function applyDimStyling(
  grid: Cell[][],
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const gh = grid.length;
  const gw = gridWidth(grid);
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) {
      if (row >= 0 && row < gh && col >= 0 && col < gw) {
        const cell = grid[row][col];
        grid[row][col] = {
          ...cell,
          style: { ...cell.style, fg: DISABLED_FG, italic: true },
        };
      }
    }
  }
}

/** Compute the content area of a box (bounds minus border). */
function contentArea(bounds: Bounds, props: NodeProps): Bounds {
  const boxProps = props as Partial<BoxNodeProps>;
  const borderInset = boxProps.border ? 1 : 0;
  return {
    x: bounds.x + borderInset,
    y: bounds.y + borderInset,
    width: Math.max(0, bounds.width - borderInset * 2),
    height: Math.max(0, bounds.height - borderInset * 2),
  };
}

/** Get scroll props from a node's props, defaulting to 0/"visible". */
function getScrollProps(props: NodeProps): {
  scrollX: number;
  scrollY: number;
  overflow: "visible" | "hidden" | "scroll";
} {
  const lp = props as Partial<LayoutProps>;
  return {
    scrollX: lp.scrollX ?? 0,
    scrollY: lp.scrollY ?? 0,
    overflow: lp.overflow ?? "visible",
  };
}

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
    if (charWidth !== 0) {
      writeChar(grid, row, col, char, style, clipBounds);
      writeContinuationCells(grid, row, col, charWidth, style, clipBounds);
      col += charWidth;
    }
  }
}

/**
 * Write a sequence of styled runs on a single row, advancing the column.
 * Returns the column after the last character written.
 */
function writeRunsOnRow(
  grid: Cell[][],
  row: number,
  startCol: number,
  runs: StyledRun[],
  clipBounds: Bounds,
): number {
  let col = startCol;
  for (const run of runs) {
    for (const char of run.text) {
      const charWidth = stringWidth(char);
      if (charWidth !== 0) {
        writeChar(grid, row, col, char, run.style, clipBounds);
        writeContinuationCells(grid, row, col, charWidth, run.style, clipBounds);
        col += charWidth;
      }
    }
  }
  return col;
}

/**
 * Build a character-level style map from runs, then wrap and render.
 * Each character in the concatenated text is mapped to its run's style.
 */
function writeWrappedRuns(
  grid: Cell[][],
  x: number,
  y: number,
  runs: StyledRun[],
  maxWidth: number,
  clipBounds: Bounds,
) {
  // Build a per-character style array indexed by position in the full text.
  const fullText = runs.map((r) => r.text).join("");
  const charStyles: CellStyle[] = [];
  for (const run of runs) {
    for (let i = 0; i < run.text.length; i++) {
      charStyles.push(run.style);
    }
  }

  // Wrap the full text, then render each line using the per-character styles.
  const lines = wrapText(fullText, maxWidth);

  // Walk through the original text and the wrapped lines in parallel.
  // wrapText preserves characters but may drop whitespace at line breaks.
  let srcIndex = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    let col = x;

    // Iterate through each character of the wrapped line
    for (const char of line) {
      // Skip whitespace characters in the source that were stripped
      // at the line boundary by wrapText
      while (srcIndex < fullText.length && fullText[srcIndex] !== char) {
        srcIndex++;
      }
      const style = charStyles[srcIndex] ?? {};
      const charWidth = stringWidth(char);
      if (charWidth !== 0) {
        writeChar(grid, y + lineIndex, col, char, style, clipBounds);
        writeContinuationCells(
          grid,
          y + lineIndex,
          col,
          charWidth,
          style,
          clipBounds,
        );
        col += charWidth;
      }
      srcIndex++;
    }
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
 * When ancestorClipBounds is provided, background fills and borders
 * are also clipped to that rectangle.
 */
function renderNodeContent(
  grid: Cell[][],
  node: LayoutNode,
  originX = 0,
  originY = 0,
  ancestorClipBounds: Bounds | null = null,
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
        if (
          row >= 0 &&
          row < gh &&
          col >= 0 &&
          col < gw &&
          isInsideClip(row, col, ancestorClipBounds)
        ) {
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
    const wrapMode = textProps.wrap ? "wrap" : "nowrap";
    // Text clips to its own bounds intersected with ancestor clip
    let textClip: Bounds = { x, y, width: bounds.width, height: bounds.height };
    if (ancestorClipBounds) {
      textClip = intersectBounds(textClip, ancestorClipBounds);
    }

    if (textProps.runs && textProps.runs.length > 0) {
      // Render styled runs (from nested Text components)
      if (wrapMode === "wrap") {
        writeWrappedRuns(grid, x, y, textProps.runs, bounds.width, textClip);
      } else {
        writeRunsOnRow(grid, y, x, textProps.runs, textClip);
      }
    } else {
      // Single content string (legacy path)
      const text = textProps.content ?? "";
      if (wrapMode === "wrap") {
        const lines = wrapText(text, bounds.width);
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
          writeString(
            grid,
            y + lineIndex,
            x,
            lines[lineIndex],
            style,
            textClip,
          );
        }
      } else {
        writeString(grid, y, x, text, style, textClip);
      }
    }
  }
}

/** Check if a cell position falls within an optional clip rectangle. */
function isInsideClip(
  row: number,
  col: number,
  clip: Bounds | null,
): boolean {
  if (!clip) {
    return true;
  }
  return (
    row >= clip.y &&
    row < clip.y + clip.height &&
    col >= clip.x &&
    col < clip.x + clip.width
  );
}

/** Intersect two bounding rectangles. */
function intersectBounds(a: Bounds, b: Bounds): Bounds {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return {
    x,
    y,
    width: Math.max(0, right - x),
    height: Math.max(0, bottom - y),
  };
}

/**
 * Compute the total content extent of a node's children.
 * Returns the maximum bottom/right edge relative to the content area origin.
 */
function computeChildContentExtent(
  database: Database,
  node: LayoutNode,
): { width: number; height: number } {
  const { bounds } = node;
  if (!bounds) {
    return { width: 0, height: 0 };
  }
  const content = contentArea(bounds, node.props);
  let maxRight = 0;
  let maxBottom = 0;
  for (const childId of node.childIds) {
    const child = database.nodes.get(childId);
    if (child?.bounds) {
      const childRight = child.bounds.x + child.bounds.width - content.x;
      const childBottom = child.bounds.y + child.bounds.height - content.y;
      if (childRight > maxRight) maxRight = childRight;
      if (childBottom > maxBottom) maxBottom = childBottom;
    }
  }
  return { width: maxRight, height: maxBottom };
}

/**
 * Render scroll indicators (triangles) for a scrollable box.
 * Shows up-arrow when scrolled down, down-arrow when more content exists below.
 */
function renderScrollIndicators(
  grid: Cell[][],
  database: Database,
  node: LayoutNode,
  scrollOffsetX: number,
  scrollOffsetY: number,
  clipBounds: Bounds | null,
) {
  const { bounds } = node;
  if (!bounds) {
    return;
  }

  const { scrollX, scrollY } = getScrollProps(node.props);
  const content = contentArea(bounds, node.props);
  const style = buildCellStyle(node.props);
  const childExtent = computeChildContentExtent(database, node);

  const indicatorCol = content.x + content.width - 1 + scrollOffsetX;
  const indicatorStyle: CellStyle = { ...style };

  // Indicators are clipped to the parent's own bounds (not the child clip bounds)
  const indicatorClip = clipBounds ?? {
    x: 0,
    y: 0,
    width: gridWidth(grid),
    height: grid.length,
  };

  // Up arrow when scrolled down
  if (scrollY > 0) {
    const upRow = content.y + scrollOffsetY;
    writeChar(grid, upRow, indicatorCol, "\u25B2", indicatorStyle, indicatorClip);
  }

  // Down arrow when there is more content below the visible area
  if (childExtent.height > content.height + scrollY) {
    const downRow = content.y + content.height - 1 + scrollOffsetY;
    writeChar(
      grid,
      downRow,
      indicatorCol,
      "\u25BC",
      indicatorStyle,
      indicatorClip,
    );
  }
}

/**
 * Rasterize a node and its children recursively.
 * scrollOffsetX/Y accumulate scroll offsets from ancestor scrollable containers.
 * clipBounds constrains rendering for children of overflow !== "visible" parents.
 */
function rasterizeNode(
  grid: Cell[][],
  database: Database,
  node: LayoutNode,
  scrollOffsetX = 0,
  scrollOffsetY = 0,
  clipBounds: Bounds | null = null,
) {
  // Skip hidden nodes entirely
  if (isDisplayNone(node.props)) {
    return;
  }

  renderNodeContent(grid, node, scrollOffsetX, scrollOffsetY, clipBounds);

  const { bounds } = node;
  if (!bounds) {
    return;
  }

  const { scrollX, scrollY, overflow } = getScrollProps(node.props);

  // Compute the scroll offset to apply to children
  const childScrollX = scrollOffsetX - scrollX;
  const childScrollY = scrollOffsetY - scrollY;

  // Compute clip bounds for children
  let childClipBounds = clipBounds;
  if (overflow === "hidden" || overflow === "scroll") {
    const content = contentArea(bounds, node.props);
    // Offset the content area by the accumulated scroll offset of ancestors
    // (not this node's own scroll -- that shifts children within the content area)
    const newClip: Bounds = {
      x: content.x + scrollOffsetX,
      y: content.y + scrollOffsetY,
      width: content.width,
      height: content.height,
    };
    // Intersect with existing clip bounds
    if (childClipBounds) {
      childClipBounds = intersectBounds(childClipBounds, newClip);
    } else {
      childClipBounds = newClip;
    }
  }

  for (const childId of node.childIds) {
    const child = database.nodes.get(childId);
    if (child) {
      rasterizeNode(
        grid,
        database,
        child,
        childScrollX,
        childScrollY,
        childClipBounds,
      );
    }
  }

  // Render scroll indicators after children so they appear on top
  if (overflow === "scroll" && bounds) {
    renderScrollIndicators(
      grid,
      database,
      node,
      scrollOffsetX,
      scrollOffsetY,
      clipBounds,
    );
  }

  // Apply dim styling for disabled nodes (after all content is rendered)
  if (isDisabled(node.props) && bounds) {
    applyDimStyling(
      grid,
      bounds.x + scrollOffsetX,
      bounds.y + scrollOffsetY,
      bounds.width,
      bounds.height,
    );
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

/**
 * Collect patches by walking the tree depth-first.
 * Each node with bounds produces one Patch.
 * scrollOffsetX/Y accumulate scroll offsets from ancestor scrollable containers.
 * clipRect constrains child patches for overflow !== "visible" parents.
 */
function collectPatches(
  database: Database,
  node: LayoutNode,
  depth: number,
  parentBounds: Bounds | null,
  patches: Patch[],
  scrollOffsetX = 0,
  scrollOffsetY = 0,
  clipRect: Bounds | null = null,
) {
  // Skip hidden nodes entirely
  if (isDisplayNone(node.props)) {
    return;
  }

  const { bounds } = node;
  if (!bounds) {
    return;
  }

  // Render this node's own content into a local grid
  const localGrid = createGrid(bounds.width, bounds.height);
  renderNodeContent(localGrid, node, -bounds.x, -bounds.y);

  // Apply dim styling for disabled nodes
  if (isDisabled(node.props)) {
    applyDimStyling(localGrid, 0, 0, bounds.width, bounds.height);
  }

  // Use explicit z prop if set, otherwise fall back to tree depth
  const lp = node.props as Partial<LayoutProps>;
  const zOrder = lp.z ?? depth;

  const patch: Patch = {
    origin: { x: bounds.x + scrollOffsetX, y: bounds.y + scrollOffsetY },
    cells: localGrid,
    z: zOrder,
  };

  // Clip to the effective clip rect (set by scrollable/overflow ancestors)
  if (clipRect) {
    patch.clip = {
      x: clipRect.x,
      y: clipRect.y,
      width: clipRect.width,
      height: clipRect.height,
    };
  } else if (parentBounds) {
    patch.clip = {
      x: parentBounds.x + scrollOffsetX,
      y: parentBounds.y + scrollOffsetY,
      width: parentBounds.width,
      height: parentBounds.height,
    };
  }

  patches.push(patch);

  const { scrollX, scrollY, overflow } = getScrollProps(node.props);

  // Compute child scroll offsets
  const childScrollX = scrollOffsetX - scrollX;
  const childScrollY = scrollOffsetY - scrollY;

  // Compute child clip rect
  let childClipRect = clipRect;
  if (overflow === "hidden" || overflow === "scroll") {
    const content = contentArea(bounds, node.props);
    const newClip: Bounds = {
      x: content.x + scrollOffsetX,
      y: content.y + scrollOffsetY,
      width: content.width,
      height: content.height,
    };
    if (childClipRect) {
      childClipRect = intersectBounds(childClipRect, newClip);
    } else {
      childClipRect = newClip;
    }
  }

  for (const childId of node.childIds) {
    const child = database.nodes.get(childId);
    if (child) {
      collectPatches(
        database,
        child,
        depth + 1,
        bounds,
        patches,
        childScrollX,
        childScrollY,
        childClipRect,
      );
    }
  }

  // Scroll indicator patches
  if (overflow === "scroll" && bounds) {
    const content = contentArea(bounds, node.props);
    const style = buildCellStyle(node.props);
    const childExtent = computeChildContentExtent(database, node);
    const indicatorCol = content.width - 1;

    if (scrollY > 0) {
      const indicatorGrid = createGrid(1, 1);
      indicatorGrid[0][0] = { char: "\u25B2", style };
      patches.push({
        origin: {
          x: content.x + indicatorCol + scrollOffsetX,
          y: content.y + scrollOffsetY,
        },
        cells: indicatorGrid,
        z: depth + 1,
        ...(clipRect ? { clip: clipRect } : {}),
      });
    }
    if (childExtent.height > content.height + scrollY) {
      const indicatorGrid = createGrid(1, 1);
      indicatorGrid[0][0] = { char: "\u25BC", style };
      patches.push({
        origin: {
          x: content.x + indicatorCol + scrollOffsetX,
          y: content.y + content.height - 1 + scrollOffsetY,
        },
        cells: indicatorGrid,
        z: depth + 1,
        ...(clipRect ? { clip: clipRect } : {}),
      });
    }
  }
}

/**
 * Rasterize each node in the tree as an individual Patch.
 * Returns one Patch per visible node.
 */
export function rasterizeToPatches(
  database: Database,
  width: number,
  height: number,
): Patch[] {
  const patches: Patch[] = [];

  if (database.rootId) {
    const root = database.nodes.get(database.rootId);
    if (root) {
      collectPatches(database, root, 0, null, patches);
    }
  }

  return patches;
}

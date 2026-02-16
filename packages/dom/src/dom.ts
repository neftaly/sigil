import {
  type Cell,
  type CellSpan,
  type CellStyle,
  type OverlayState,
  SELECTION_OVERLAY_PREFIX,
  groupCells,
  styleEquals,
} from "@charui/core";

/**
 * Render a Cell[][] grid into a DOM container element.
 * Each row is a <div>, each cell is a <span>.
 * Diff-based: reuses existing DOM nodes, only updates changed cells.
 */
export function renderToDOM(
  container: HTMLElement,
  grid: Cell[][],
  prevGrid: Cell[][] | null,
): void {
  const height = grid.length;

  // Ensure we have the right number of row divs
  while (container.children.length < height) {
    const row = document.createElement("div");
    row.style.whiteSpace = "pre";
    row.style.fontFamily = "inherit";
    container.appendChild(row);
  }
  while (container.children.length > height) {
    container.removeChild(container.lastChild!);
  }

  for (let y = 0; y < height; y++) {
    const rowEl = container.children[y] as HTMLElement;
    const row = grid[y];
    const prevRow = prevGrid?.[y];

    const spans = groupCells(row);
    const prevSpans = prevRow ? groupCells(prevRow) : null;

    // Only update if row changed
    if (!prevSpans || !spansEqual(spans, prevSpans)) {
      rowEl.textContent = "";
      for (const span of spans) {
        const el = document.createElement("span");
        el.textContent = span.text;
        applyStyle(el, span.style);
        rowEl.appendChild(el);
      }
    }
  }
}

function spansEqual(a: CellSpan[], b: CellSpan[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].text !== b[i].text ||
      a[i].col !== b[i].col ||
      !styleEquals(a[i].style, b[i].style)
    ) {
      return false;
    }
  }
  return true;
}

function applyStyle(el: HTMLElement, style: CellStyle) {
  if (style.fg) {
    el.style.color = style.fg;
  }
  if (style.bg) {
    el.style.backgroundColor = style.bg;
  }
  if (style.bold) {
    el.style.fontWeight = "bold";
  }
  if (style.italic) {
    el.style.fontStyle = "italic";
  }
  if (style.underline) {
    el.style.textDecoration = "underline";
  }
}

/**
 * Convert mouse pixel coordinates to grid cell coordinates.
 * Accepts a cellWidth to avoid re-measuring on every event.
 */
export function pixelToGrid(
  container: HTMLElement,
  clientX: number,
  clientY: number,
  cellWidth: number,
): { col: number; row: number } | null {
  const rect = container.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {
    return null;
  }

  const rowCount = container.children.length;
  if (rowCount === 0) {
    return null;
  }

  const cellHeight = rect.height / rowCount;
  const col = Math.floor(x / cellWidth);
  const row = Math.floor(y / cellHeight);

  return { col, row };
}

/**
 * Map a grid (row, col) position to a DOM (node, offset) for Selection API.
 * Walks the spans in the row div, summing text lengths.
 */
function gridToTextNode(
  container: HTMLElement,
  row: number,
  col: number,
): { node: Node; offset: number } | null {
  const rowEl = container.children[row] as HTMLElement | undefined;
  if (!rowEl) {
    return null;
  }

  let accumulated = 0;
  for (const child of rowEl.childNodes) {
    const text = child.textContent ?? "";
    if (accumulated + text.length > col) {
      // Col is within this span's text node
      const textNode = child.firstChild ?? child;
      return { node: textNode, offset: col - accumulated };
    }
    accumulated += text.length;
  }

  // Col is at or past end of row — point to end of last span
  const { lastChild } = rowEl;
  if (lastChild) {
    const textNode = lastChild.firstChild ?? lastChild;
    return { node: textNode, offset: (textNode.textContent ?? "").length };
  }
  return null;
}

/**
 * Sync charui overlay selection to browser Selection API for clipboard support.
 * Finds selection-* overlays and maps their grid ranges to DOM positions.
 */
export function syncSelectionToDOM(
  container: HTMLElement,
  overlayState: OverlayState,
): void {
  const selection = document.getSelection();
  if (!selection) {
    return;
  }

  // Find the selection overlay (if any)
  let selectionOverlay = null;
  for (const overlay of overlayState.overlays.values()) {
    if (overlay.id.startsWith(SELECTION_OVERLAY_PREFIX)) {
      selectionOverlay = overlay;
      break;
    }
  }

  if (!selectionOverlay || selectionOverlay.ranges.length === 0) {
    // No selection overlay — don't clear browser selection
    // (user might have free-selected text outside inputs)
    return;
  }

  const [range] = selectionOverlay.ranges;

  // Only sync non-collapsed selections (cursor/caret is overlay-only)
  if (range.startRow === range.endRow && range.endCol - range.startCol <= 0) {
    return;
  }

  const start = gridToTextNode(container, range.startRow, range.startCol);
  const end = gridToTextNode(container, range.endRow, range.endCol + 1);

  if (!start || !end) {
    return;
  }

  try {
    selection.setBaseAndExtent(start.node, start.offset, end.node, end.offset);
  } catch {
    // Invalid range — ignore
  }
}

/**
 * Measure the width of a single monospace character in the container.
 */
export function measureCharWidth(container: HTMLElement): number {
  const { fontSize } = getComputedStyle(container);

  const span = document.createElement("span");
  span.style.fontFamily = "inherit";
  span.style.fontSize = fontSize;
  span.style.visibility = "hidden";
  span.style.position = "absolute";
  span.textContent = "X";
  container.appendChild(span);
  const { width } = span.getBoundingClientRect();
  container.removeChild(span);

  return width;
}

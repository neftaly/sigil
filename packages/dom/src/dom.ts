import type { Cell, CellStyle } from "@charui/core";

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
  const width = grid[0]?.length ?? 0;

  // Ensure we have the right number of row divs
  while (container.children.length < height) {
    const row = document.createElement("div");
    row.style.whiteSpace = "pre";
    row.style.lineHeight = "1";
    row.style.fontFamily = "inherit";
    row.style.height = "1em";
    container.appendChild(row);
  }
  while (container.children.length > height) {
    container.removeChild(container.lastChild!);
  }

  for (let y = 0; y < height; y++) {
    const rowEl = container.children[y] as HTMLElement;
    const row = grid[y];
    const prevRow = prevGrid?.[y];

    // Build spans for this row
    // Group consecutive cells with same style into single spans
    const spans = buildSpans(row, width);
    const prevSpans = prevRow ? buildSpans(prevRow, width) : null;

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

interface Span {
  text: string;
  style: CellStyle;
}

function buildSpans(row: Cell[], width: number): Span[] {
  const spans: Span[] = [];
  let current: Span | null = null;

  for (let x = 0; x < width; x++) {
    const cell = row[x];
    if (!cell.continuation) {
      if (current && styleEquals(current.style, cell.style)) {
        current.text += cell.char;
      } else {
        if (current) {
          spans.push(current);
        }
        current = { text: cell.char, style: { ...cell.style } };
      }
    }
  }

  if (current) {
    spans.push(current);
  }

  return spans;
}

function styleEquals(a: CellStyle, b: CellStyle): boolean {
  return (
    a.fg === b.fg &&
    a.bg === b.bg &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline
  );
}

function spansEqual(a: Span[], b: Span[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i].text !== b[i].text || !styleEquals(a[i].style, b[i].style)) {
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

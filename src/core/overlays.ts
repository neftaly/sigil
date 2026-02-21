import type { Bounds } from "./database.ts";
import { type Cell, type CellStyle, gridWidth } from "./cell.ts";

export const SELECTION_OVERLAY_PREFIX = "selection-";

// --- Types ---

export interface GridRange {
  readonly startRow: number;
  readonly startCol: number;
  readonly endRow: number;
  readonly endCol: number;
}

export type StyleTransform =
  | { type: "invert" }
  | { type: "merge"; style: Partial<CellStyle> };

export interface Overlay {
  readonly id: string;
  readonly priority: number;
  readonly ranges: readonly GridRange[];
  readonly transform: StyleTransform;
}

export interface OverlayState {
  overlays: Map<string, Overlay>;
  version: number;
}

// --- State management ---

export function createOverlayState(): OverlayState {
  return { overlays: new Map(), version: 0 };
}

export function setOverlay(state: OverlayState, overlay: Overlay): void {
  state.overlays.set(overlay.id, overlay);
  state.version++;
}

export function removeOverlay(state: OverlayState, id: string): void {
  if (state.overlays.delete(id)) {
    state.version++;
  }
}

// --- Apply overlays to full grid ---

export function applyOverlays(
  grid: Cell[][],
  overlayState: OverlayState,
): Cell[][] {
  if (overlayState.overlays.size === 0) {
    return grid;
  }

  const result = cloneGrid(grid);
  const sorted = Array.from(overlayState.overlays.values()).sort(
    (a, b) => a.priority - b.priority,
  );

  for (const overlay of sorted) {
    for (const range of overlay.ranges) {
      applyTransformToRange(result, range, overlay.transform);
    }
  }

  return result;
}

// --- Apply overlays to a single node's grid (for 3D renderer) ---

export function applyOverlaysToGrid(
  grid: Cell[][],
  nodeBounds: Bounds,
  overlayState: OverlayState,
): Cell[][] {
  if (overlayState.overlays.size === 0) {
    return grid;
  }

  const relevant = Array.from(overlayState.overlays.values())
    .filter((overlay) =>
      overlay.ranges.some((range) => rangeIntersectsBounds(range, nodeBounds)),
    )
    .sort((a, b) => a.priority - b.priority);

  if (relevant.length === 0) {
    return grid;
  }

  const result = cloneGrid(grid);

  for (const overlay of relevant) {
    for (const range of overlay.ranges) {
      const local = gridRangeToLocal(range, nodeBounds);
      if (local) {
        applyTransformToRange(result, local, overlay.transform);
      }
    }
  }

  return result;
}

// --- Helpers ---

function cloneGrid(grid: Cell[][]): Cell[][] {
  return grid.map((row) =>
    row.map((cell) => ({ ...cell, style: { ...cell.style } })),
  );
}

function applyTransformToRange(
  grid: Cell[][],
  range: GridRange,
  transform: StyleTransform,
): void {
  const height = grid.length;
  const width = gridWidth(grid);

  for (let row = range.startRow; row <= range.endRow; row++) {
    if (row >= 0 && row < height) {
      const rowStartCol = row === range.startRow ? range.startCol : 0;
      const rowEndCol = row === range.endRow ? range.endCol : width - 1;

      for (let col = rowStartCol; col <= rowEndCol; col++) {
        if (col >= 0 && col < width) {
          const cell = grid[row][col];
          grid[row][col] = {
            ...cell,
            style: applyTransform(cell.style, transform),
          };
        }
      }
    }
  }
}

const INVERT_DEFAULT_FG = "#000";
const INVERT_DEFAULT_BG = "#ccc";

function applyTransform(
  style: CellStyle,
  transform: StyleTransform,
): CellStyle {
  switch (transform.type) {
    case "invert":
      return {
        ...style,
        fg: style.bg ?? INVERT_DEFAULT_FG,
        bg: style.fg ?? INVERT_DEFAULT_BG,
      };
    case "merge":
      return { ...style, ...transform.style };
  }
}

function rangeIntersectsBounds(range: GridRange, bounds: Bounds): boolean {
  return !(
    range.endCol < bounds.x ||
    range.startCol >= bounds.x + bounds.width ||
    range.endRow < bounds.y ||
    range.startRow >= bounds.y + bounds.height
  );
}

function gridRangeToLocal(range: GridRange, bounds: Bounds): GridRange | null {
  const startRow = Math.max(0, range.startRow - bounds.y);
  const endRow = Math.min(bounds.height - 1, range.endRow - bounds.y);
  const startCol = Math.max(0, range.startCol - bounds.x);
  const endCol = Math.min(bounds.width - 1, range.endCol - bounds.x);

  if (startRow > endRow || startCol > endCol) {
    return null;
  }

  return { startRow, endRow, startCol, endCol };
}

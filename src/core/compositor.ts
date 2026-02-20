import stringWidth from "string-width";

import { type Cell, type CellStyle, createGrid } from "./cell.ts";

/** A rectangular region of cells at a position and z-level. */
export interface Patch {
  /** Grid origin (column, row) in the parent coordinate space. */
  origin: { x: number; y: number };
  /** 2D array of cells (rows x columns). */
  cells: Cell[][];
  /** Z-order for layering. Higher z renders on top. */
  z: number;
  /** Optional clip rectangle. Cells outside this rect are not rendered. */
  clip?: { x: number; y: number; width: number; height: number };
}

/** True when a cell is a blank space with no styling. */
function isBlankCell(cell: Cell): boolean {
  return (
    cell.char === " " &&
    !cell.continuation &&
    !cell.style.fg &&
    !cell.style.bg &&
    !cell.style.bold &&
    !cell.style.italic &&
    !cell.style.underline
  );
}

/** True when a cell is a wide-character primary cell (display width > 1). */
function isWideChar(cell: Cell): boolean {
  return !cell.continuation && cell.char !== "" && stringWidth(cell.char) > 1;
}

/**
 * Compose patches into a final grid. Patches are layered by z-order
 * (lower z first, higher z on top). Non-space cells overwrite lower layers.
 *
 * If a patch has a clip rect, only cells within the clip are applied.
 */
export function compose(
  patches: Patch[],
  width: number,
  height: number,
): Cell[][] {
  const grid = createGrid(width, height);

  // Stable sort by z (lower z first, so higher z overwrites)
  const sorted = [...patches].sort((a, b) => a.z - b.z);

  for (const patch of sorted) {
    const patchHeight = patch.cells.length;
    if (patchHeight === 0) {
      continue;
    }

    for (let row = 0; row < patchHeight; row++) {
      const patchRow = patch.cells[row];
      const patchWidth = patchRow.length;

      for (let col = 0; col < patchWidth; col++) {
        const cell = patchRow[col];
        const targetX = patch.origin.x + col;
        const targetY = patch.origin.y + row;

        // Skip if outside grid bounds
        if (targetX < 0 || targetX >= width || targetY < 0 || targetY >= height) {
          continue;
        }

        // Skip if outside clip rect
        if (patch.clip) {
          const { x: cx, y: cy, width: cw, height: ch } = patch.clip;
          if (targetX < cx || targetX >= cx + cw || targetY < cy || targetY >= cy + ch) {
            continue;
          }
        }

        // Skip blank cells so they don't overwrite lower layers
        if (isBlankCell(cell)) {
          continue;
        }

        // Skip orphaned continuation cells (primary is clipped/out of bounds)
        if (cell.continuation) {
          // Check if the primary cell for this continuation would be visible.
          // Walk left to find the primary cell's column.
          let primaryCol = col - 1;
          while (primaryCol >= 0 && patchRow[primaryCol]?.continuation) {
            primaryCol--;
          }
          const primaryTargetX = patch.origin.x + primaryCol;
          const primaryTargetY = targetY;
          const primaryVisible =
            primaryTargetX >= 0 &&
            primaryTargetX < width &&
            primaryTargetY >= 0 &&
            primaryTargetY < height &&
            (!patch.clip ||
              (primaryTargetX >= patch.clip.x &&
                primaryTargetX < patch.clip.x + patch.clip.width &&
                primaryTargetY >= patch.clip.y &&
                primaryTargetY < patch.clip.y + patch.clip.height));
          if (!primaryVisible) {
            // Primary is clipped/out of bounds; render space instead
            grid[targetY][targetX] = { char: " ", style: cell.style };
            continue;
          }
        }

        // Wide char edge cases: check if all continuation cells are visible
        if (isWideChar(cell)) {
          const charW = stringWidth(cell.char);
          let allContinuationsVisible = true;
          for (let offset = 1; offset < charW; offset++) {
            const contX = targetX + offset;
            const contY = targetY;
            if (contX < 0 || contX >= width || contY < 0 || contY >= height) {
              allContinuationsVisible = false;
              break;
            }
            if (patch.clip) {
              const { x: cx, y: cy, width: cw, height: ch } = patch.clip;
              if (contX < cx || contX >= cx + cw || contY < cy || contY >= cy + ch) {
                allContinuationsVisible = false;
                break;
              }
            }
          }
          if (!allContinuationsVisible) {
            // Wide char would be partially visible; replace with space
            grid[targetY][targetX] = { char: " ", style: cell.style };
            continue;
          }
        }

        grid[targetY][targetX] = cell;
      }
    }
  }

  return grid;
}

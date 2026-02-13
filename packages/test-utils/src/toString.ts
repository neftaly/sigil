import { type Cell, gridToString } from "@charui/core";

/** Convert a Cell[][] grid to a plain string. */
export function toString(grid: Cell[][]): string {
  return gridToString(grid);
}

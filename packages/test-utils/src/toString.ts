import type { Cell } from '@charui/core'

/** Convert a Cell[][] grid to a plain string. */
export function toString(grid: Cell[][]): string {
  return grid
    .map((row) =>
      row
        .filter((cell) => !cell.continuation)
        .map((cell) => cell.char)
        .join(''),
    )
    .join('\n')
}

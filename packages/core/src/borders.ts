import boxes from "cli-boxes";

import type { Cell, CellStyle } from "./cell.ts";

export type BorderStyle = keyof typeof boxes;

export function writeBorder(
  grid: Cell[][],
  x: number,
  y: number,
  width: number,
  height: number,
  borderStyle: BorderStyle = "single",
  cellStyle: CellStyle = {},
) {
  const box = boxes[borderStyle];
  if (width < 2 || height < 2) {
    return;
  }

  const gridHeight = grid.length;
  const gridWidth = grid[0]?.length ?? 0;

  function writeCell(row: number, col: number, char: string) {
    if (row >= 0 && row < gridHeight && col >= 0 && col < gridWidth) {
      grid[row][col] = { char, style: cellStyle };
    }
  }

  // Corners
  writeCell(y, x, box.topLeft);
  writeCell(y, x + width - 1, box.topRight);
  writeCell(y + height - 1, x, box.bottomLeft);
  writeCell(y + height - 1, x + width - 1, box.bottomRight);

  // Top and bottom edges
  for (let col = x + 1; col < x + width - 1; col++) {
    writeCell(y, col, box.top);
    writeCell(y + height - 1, col, box.bottom);
  }

  // Left and right edges
  for (let row = y + 1; row < y + height - 1; row++) {
    writeCell(row, x, box.left);
    writeCell(row, x + width - 1, box.right);
  }
}

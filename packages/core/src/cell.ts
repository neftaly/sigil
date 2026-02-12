export interface CellStyle {
  fg?: string;
  bg?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface Cell {
  char: string;
  style: CellStyle;
  continuation?: boolean;
}

export function createGrid(width: number, height: number): Cell[][] {
  const grid: Cell[][] = [];
  for (let row = 0; row < height; row++) {
    const cells: Cell[] = [];
    for (let col = 0; col < width; col++) {
      cells.push({ char: " ", style: {} });
    }
    grid.push(cells);
  }
  return grid;
}

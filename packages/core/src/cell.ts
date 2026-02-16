export interface CellStyle {
  readonly fg?: string;
  readonly bg?: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
}

export interface Cell {
  readonly char: string;
  readonly style: CellStyle;
  readonly continuation?: boolean;
}

export function styleEquals(a: CellStyle, b: CellStyle): boolean {
  return (
    a.fg === b.fg &&
    a.bg === b.bg &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline
  );
}

export interface CellSpan {
  readonly text: string;
  readonly col: number;
  readonly style: CellStyle;
}

/** Group consecutive cells with the same style into spans, skipping continuations. */
export function groupCells(row: readonly Cell[]): CellSpan[] {
  const spans: CellSpan[] = [];
  let current: { text: string; col: number; style: CellStyle } | null = null;

  for (let col = 0; col < row.length; col++) {
    const cell = row[col];
    if (!cell.continuation) {
      if (current && styleEquals(current.style, cell.style)) {
        current.text += cell.char;
      } else {
        if (current) {
          spans.push(current);
        }
        current = { text: cell.char, col, style: cell.style };
      }
    }
  }
  if (current) {
    spans.push(current);
  }

  return spans;
}

/** Convert a Cell[][] grid to a plain string, skipping continuation cells. */
export function gridToString(grid: Cell[][]): string {
  return grid
    .map((row) =>
      row
        .filter((cell) => !cell.continuation)
        .map((cell) => cell.char)
        .join(""),
    )
    .join("\n");
}

export function gridWidth(grid: Cell[][]): number {
  return grid[0]?.length ?? 0;
}

export function createGrid(width: number, height: number): Cell[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ char: " ", style: {} })),
  );
}

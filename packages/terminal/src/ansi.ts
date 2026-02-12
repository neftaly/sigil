import { type Cell, type CellStyle, parseColor } from "@charui/core";

function styleToAnsi(style: CellStyle): string {
  const codes: string[] = [];

  if (style.bold) {
    codes.push("\x1b[1m");
  }
  if (style.italic) {
    codes.push("\x1b[3m");
  }
  if (style.underline) {
    codes.push("\x1b[4m");
  }
  if (style.fg) {
    const rgb = parseColor(style.fg);
    if (rgb) {
      codes.push(`\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m`);
    }
  }
  if (style.bg) {
    const rgb = parseColor(style.bg);
    if (rgb) {
      codes.push(`\x1b[48;2;${rgb[0]};${rgb[1]};${rgb[2]}m`);
    }
  }

  return codes.join("");
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

function rowToAnsi(row: Cell[]): string {
  let line = "";
  let currentStyle: CellStyle | null = null;

  for (const cell of row) {
    if (cell.continuation) {
      // Skip continuation cells (wide chars)
    } else {
      const hasStyle =
        cell.style.fg !== undefined ||
        cell.style.bg !== undefined ||
        cell.style.bold ||
        cell.style.italic ||
        cell.style.underline;

      if (!currentStyle || !styleEquals(currentStyle, cell.style)) {
        if (currentStyle) {
          line += "\x1b[0m";
        }
        if (hasStyle) {
          line += styleToAnsi(cell.style);
        }
        currentStyle = hasStyle ? cell.style : null;
      }

      line += cell.char;
    }
  }

  if (currentStyle) {
    line += "\x1b[0m";
  }

  return line;
}

/** Convert a Cell[][] grid to an ANSI-escaped string. */
export function toAnsi(grid: Cell[][]): string {
  return grid.map(rowToAnsi).join("\r\n");
}

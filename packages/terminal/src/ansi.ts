import {
  type Cell,
  type CellStyle,
  groupCells,
  parseColor,
} from "@charui/core";

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

function hasAnyStyling(style: CellStyle): boolean {
  return (
    style.fg !== undefined ||
    style.bg !== undefined ||
    Boolean(style.bold) ||
    Boolean(style.italic) ||
    Boolean(style.underline)
  );
}

function rowToAnsi(row: Cell[]): string {
  const spans = groupCells(row);
  let line = "";
  let styled = false;

  for (const span of spans) {
    const needsStyle = hasAnyStyling(span.style);
    if (styled) {
      line += "\x1b[0m";
      styled = false;
    }
    if (needsStyle) {
      line += styleToAnsi(span.style);
      styled = true;
    }
    line += span.text;
  }

  if (styled) {
    line += "\x1b[0m";
  }

  return line;
}

/** Convert a Cell[][] grid to an ANSI-escaped string. */
export function toAnsi(grid: Cell[][]): string {
  return grid.map(rowToAnsi).join("\r\n");
}

import type { OverlayState, PointerEvent } from "@charui/core";

/** Minimal terminal interface for selection sync (avoids @xterm/xterm dependency). */
interface TerminalSelection {
  select(column: number, row: number, length: number): void;
  clearSelection(): void;
}

// eslint-disable-next-line no-control-regex -- ESC is inherent to the SGR protocol
const SGR_MOUSE_RE = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])$/;

/**
 * Parse SGR mouse report sequences from xterm.js.
 * Format: ESC[<button;col;row(M|m)
 * M = press/move, m = release
 */
export function parseSGRMouse(data: string): {
  type: PointerEvent["type"];
  col: number;
  row: number;
  button: number;
} | null {
  const match = data.match(SGR_MOUSE_RE);
  if (!match) {
    return null;
  }
  const buttonCode = Number.parseInt(match[1], 10);
  // 1-based → 0-based
  const col = Number.parseInt(match[2], 10) - 1;
  const row = Number.parseInt(match[3], 10) - 1;
  const isRelease = match[4] === "m";

  // Bit 5 (32) = motion event
  const isMotion = (buttonCode & 32) !== 0;
  // Low 2 bits = button number
  const button = buttonCode & 3;

  let type: PointerEvent["type"];
  if (isRelease) {
    type = "pointerup";
  } else if (isMotion) {
    type = "pointermove";
  } else {
    type = "pointerdown";
  }

  return { type, col, row, button };
}

/**
 * Sync charui overlay selection state to xterm.js native selection.
 * Finds the first selection-* overlay and maps it to term.select().
 */
export function syncSelectionToTerminal(
  term: TerminalSelection,
  overlayState: OverlayState | null,
): void {
  if (!overlayState) {
    term.clearSelection();
    return;
  }

  let selectionOverlay = null;
  for (const overlay of overlayState.overlays.values()) {
    if (overlay.id.startsWith("selection-")) {
      selectionOverlay = overlay;
      break;
    }
  }

  if (!selectionOverlay || selectionOverlay.ranges.length === 0) {
    term.clearSelection();
    return;
  }

  const [range] = selectionOverlay.ranges;
  if (range.startRow === range.endRow && range.endCol - range.startCol <= 0) {
    term.clearSelection();
    return;
  }

  const length = range.endCol - range.startCol + 1;
  term.select(range.startCol, range.startRow, length);
}

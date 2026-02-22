import type React from "react";
import type { KeyEvent } from "../core/events.ts";
import {
  moveBackCount,
  moveForwardCount,
  wordBoundaryLeft,
  wordBoundaryRight,
} from "./text-utils.ts";

export interface CursorPos {
  line: number;
  col: number;
}

/**
 * Wrap a single line to fit within maxWidth, returning the wrapped sub-lines.
 */
export function wrapLine(line: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return [line];
  if (line.length <= maxWidth) return [line];

  const result: string[] = [];
  for (let i = 0; i < line.length; i += maxWidth) {
    result.push(line.slice(i, i + maxWidth));
  }
  return result;
}

/**
 * Convert a cursor in logical (line, col) to a display row when wrapping is active.
 */
export function logicalToDisplayRow(
  lines: string[],
  cursor: CursorPos,
  maxWidth: number,
  doWrap: boolean,
): number {
  let displayRow = 0;
  for (let i = 0; i < cursor.line && i < lines.length; i++) {
    if (doWrap) {
      displayRow += wrapLine(lines[i], maxWidth).length;
    } else {
      displayRow += 1;
    }
  }
  if (doWrap && cursor.line < lines.length) {
    const subLine = Math.floor(cursor.col / maxWidth);
    const maxSubLine = Math.max(0, Math.ceil(lines[cursor.line].length / maxWidth) - 1);
    displayRow += Math.min(subLine, maxSubLine);
  }
  return displayRow;
}

/**
 * Convert a CursorPos to a flat character offset within the text.
 * Each line is followed by a newline except the last.
 */
export function cursorToOffset(pos: CursorPos, lines: string[]): number {
  let offset = 0;
  for (let i = 0; i < pos.line && i < lines.length; i++) {
    offset += lines[i].length + 1; // +1 for the newline
  }
  offset += pos.col;
  return offset;
}

/**
 * Convert a flat character offset back to a CursorPos.
 */
export function offsetToCursor(offset: number, lines: string[]): CursorPos {
  let remaining = offset;
  for (let i = 0; i < lines.length; i++) {
    if (remaining <= lines[i].length) {
      return { line: i, col: remaining };
    }
    remaining -= lines[i].length + 1; // +1 for the newline
  }
  // Clamp to end of last line
  const lastLine = lines.length - 1;
  return { line: lastLine, col: (lines[lastLine] ?? "").length };
}

/**
 * Return the selection range ordered as start/end based on offset comparison.
 */
export function getSelectionRange(
  anchor: CursorPos,
  cursor: CursorPos,
  lines: string[],
): { start: CursorPos; end: CursorPos; startOffset: number; endOffset: number } {
  const anchorOffset = cursorToOffset(anchor, lines);
  const cursorOffset = cursorToOffset(cursor, lines);
  if (anchorOffset <= cursorOffset) {
    return { start: anchor, end: cursor, startOffset: anchorOffset, endOffset: cursorOffset };
  }
  return { start: cursor, end: anchor, startOffset: cursorOffset, endOffset: anchorOffset };
}

/**
 * Delete the selected text range and return the new text and cursor position.
 */
export function deleteSelection(
  lines: string[],
  anchor: CursorPos,
  cursor: CursorPos,
): { newText: string; newCursor: CursorPos } {
  const { start, end } = getSelectionRange(anchor, cursor, lines);
  const text = lines.join("\n");
  const startOffset = cursorToOffset(start, lines);
  const endOffset = cursorToOffset(end, lines);
  const newText = text.slice(0, startOffset) + text.slice(endOffset);
  const newLines = newText.split("\n");
  const newCursor = offsetToCursor(startOffset, newLines);
  return { newText, newCursor };
}

/**
 * Handle navigation keys: ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Home, End.
 * Returns the new cursor position if handled, or undefined if not a navigation key.
 * When wrap is enabled, ArrowUp/ArrowDown navigate between visual sub-lines within
 * the same logical line before moving to adjacent logical lines.
 */
export function computeNavigation(
  key: string,
  currentCursor: CursorPos,
  currentLines: string[],
  wrap?: boolean,
  innerWidth?: number,
): CursorPos | undefined {
  if (key === "ArrowLeft") {
    const currentLine = currentLines[currentCursor.line] ?? "";
    if (currentCursor.col > 0) {
      const count = moveBackCount(currentLine, currentCursor.col);
      return { line: currentCursor.line, col: currentCursor.col - count };
    }
    if (currentCursor.line > 0) {
      const prevLine = currentLines[currentCursor.line - 1] ?? "";
      return { line: currentCursor.line - 1, col: prevLine.length };
    }
    return currentCursor;
  }

  if (key === "ArrowRight") {
    const currentLine = currentLines[currentCursor.line] ?? "";
    if (currentCursor.col < currentLine.length) {
      const count = moveForwardCount(currentLine, currentCursor.col);
      return { line: currentCursor.line, col: currentCursor.col + count };
    }
    if (currentCursor.line < currentLines.length - 1)
      return { line: currentCursor.line + 1, col: 0 };
    return currentCursor;
  }

  if (key === "ArrowUp") {
    if (wrap && innerWidth && innerWidth > 0) {
      // If cursor is on a wrapped sub-line (col >= innerWidth), move up one visual row
      if (currentCursor.col - innerWidth >= 0) {
        return { line: currentCursor.line, col: currentCursor.col - innerWidth };
      }
    }
    if (currentCursor.line > 0) {
      const prevLine = currentLines[currentCursor.line - 1] ?? "";
      if (wrap && innerWidth && innerWidth > 0) {
        // Move to the last sub-line of the previous logical line, preserving visual column
        const visualCol = currentCursor.col % (innerWidth || 1);
        const lastSubLineStart = Math.floor(prevLine.length / innerWidth) * innerWidth;
        const newCol = Math.min(lastSubLineStart + visualCol, prevLine.length);
        return { line: currentCursor.line - 1, col: newCol };
      }
      return { line: currentCursor.line - 1, col: Math.min(currentCursor.col, prevLine.length) };
    }
    return currentCursor;
  }

  if (key === "ArrowDown") {
    if (wrap && innerWidth && innerWidth > 0) {
      const currentLine = currentLines[currentCursor.line] ?? "";
      // If there is a next sub-line within this logical line
      if (currentCursor.col + innerWidth <= currentLine.length) {
        return { line: currentCursor.line, col: currentCursor.col + innerWidth };
      }
    }
    if (currentCursor.line < currentLines.length - 1) {
      const nextLine = currentLines[currentCursor.line + 1] ?? "";
      if (wrap && innerWidth && innerWidth > 0) {
        // Move to the first sub-line of the next logical line, preserving visual column
        const visualCol = currentCursor.col % (innerWidth || 1);
        const newCol = Math.min(visualCol, nextLine.length);
        return { line: currentCursor.line + 1, col: newCol };
      }
      return { line: currentCursor.line + 1, col: Math.min(currentCursor.col, nextLine.length) };
    }
    return currentCursor;
  }

  if (key === "Home") {
    return { line: currentCursor.line, col: 0 };
  }

  if (key === "End") {
    return { line: currentCursor.line, col: (currentLines[currentCursor.line] ?? "").length };
  }

  return undefined;
}

/**
 * Handle editing keys: Enter, Backspace, Delete.
 * Returns true if the event was handled.
 */
export function handleEditing(
  event: KeyEvent,
  currentLines: string[],
  cursor: CursorPos,
  setCursor: React.Dispatch<React.SetStateAction<CursorPos>>,
  onChange: ((value: string) => void) | undefined,
  selectionAnchor: CursorPos | null,
  setSelectionAnchor: React.Dispatch<React.SetStateAction<CursorPos | null>>,
): boolean | undefined {
  if (event.key === "Enter") {
    // If there's a selection, delete it first, then split at cursor
    if (selectionAnchor) {
      const { newText, newCursor } = deleteSelection(currentLines, selectionAnchor, cursor);
      const newLines = newText.split("\n");
      const line = newLines[newCursor.line] ?? "";
      const before = line.slice(0, newCursor.col);
      const after = line.slice(newCursor.col);
      newLines.splice(newCursor.line, 1, before, after);
      setCursor({ line: newCursor.line + 1, col: 0 });
      setSelectionAnchor(null);
      onChange?.(newLines.join("\n"));
    } else {
      const line = currentLines[cursor.line] ?? "";
      const before = line.slice(0, cursor.col);
      const after = line.slice(cursor.col);
      const newLines = [...currentLines];
      newLines.splice(cursor.line, 1, before, after);
      setCursor({ line: cursor.line + 1, col: 0 });
      onChange?.(newLines.join("\n"));
    }
    return true;
  }

  // Ctrl+Backspace: delete word backward.
  if (event.ctrlKey && event.key === "Backspace") {
    if (selectionAnchor) {
      const { newText, newCursor } = deleteSelection(currentLines, selectionAnchor, cursor);
      setCursor(newCursor);
      setSelectionAnchor(null);
      onChange?.(newText);
    } else if (cursor.col > 0) {
      const line = currentLines[cursor.line] ?? "";
      const boundary = wordBoundaryLeft(line, cursor.col);
      const newLine = line.slice(0, boundary) + line.slice(cursor.col);
      const newLines = [...currentLines];
      newLines[cursor.line] = newLine;
      setCursor({ line: cursor.line, col: boundary });
      onChange?.(newLines.join("\n"));
    } else if (cursor.line > 0) {
      // At start of line — merge with previous line (same as regular Backspace)
      const prevLine = currentLines[cursor.line - 1] ?? "";
      const currentLine = currentLines[cursor.line] ?? "";
      const newLines = [...currentLines];
      newLines.splice(cursor.line - 1, 2, prevLine + currentLine);
      setCursor({ line: cursor.line - 1, col: prevLine.length });
      onChange?.(newLines.join("\n"));
    }
    return true;
  }

  // Ctrl+Delete: delete word forward.
  if (event.ctrlKey && event.key === "Delete") {
    if (selectionAnchor) {
      const { newText, newCursor } = deleteSelection(currentLines, selectionAnchor, cursor);
      setCursor(newCursor);
      setSelectionAnchor(null);
      onChange?.(newText);
    } else {
      const line = currentLines[cursor.line] ?? "";
      if (cursor.col < line.length) {
        const boundary = wordBoundaryRight(line, cursor.col);
        const newLine = line.slice(0, cursor.col) + line.slice(boundary);
        const newLines = [...currentLines];
        newLines[cursor.line] = newLine;
        onChange?.(newLines.join("\n"));
      } else if (cursor.line < currentLines.length - 1) {
        // At end of line — merge with next line (same as regular Delete)
        const nextLine = currentLines[cursor.line + 1] ?? "";
        const newLines = [...currentLines];
        newLines.splice(cursor.line, 2, line + nextLine);
        onChange?.(newLines.join("\n"));
      }
    }
    return true;
  }

  if (event.key === "Backspace") {
    if (selectionAnchor) {
      const { newText, newCursor } = deleteSelection(currentLines, selectionAnchor, cursor);
      setCursor(newCursor);
      setSelectionAnchor(null);
      onChange?.(newText);
    } else if (cursor.col > 0) {
      const line = currentLines[cursor.line] ?? "";
      const count = moveBackCount(line, cursor.col);
      const newLine =
        line.slice(0, cursor.col - count) + line.slice(cursor.col);
      const newLines = [...currentLines];
      newLines[cursor.line] = newLine;
      setCursor((c) => ({ line: c.line, col: c.col - count }));
      onChange?.(newLines.join("\n"));
    } else if (cursor.line > 0) {
      // Merge with previous line.
      const prevLine = currentLines[cursor.line - 1] ?? "";
      const currentLine = currentLines[cursor.line] ?? "";
      const newLines = [...currentLines];
      newLines.splice(cursor.line - 1, 2, prevLine + currentLine);
      setCursor({ line: cursor.line - 1, col: prevLine.length });
      onChange?.(newLines.join("\n"));
    }
    return true;
  }

  if (event.key === "Delete") {
    if (selectionAnchor) {
      const { newText, newCursor } = deleteSelection(currentLines, selectionAnchor, cursor);
      setCursor(newCursor);
      setSelectionAnchor(null);
      onChange?.(newText);
    } else {
      const line = currentLines[cursor.line] ?? "";
      if (cursor.col < line.length) {
        const count = moveForwardCount(line, cursor.col);
        const newLine =
          line.slice(0, cursor.col) + line.slice(cursor.col + count);
        const newLines = [...currentLines];
        newLines[cursor.line] = newLine;
        onChange?.(newLines.join("\n"));
      } else if (cursor.line < currentLines.length - 1) {
        // Merge with next line.
        const nextLine = currentLines[cursor.line + 1] ?? "";
        const newLines = [...currentLines];
        newLines.splice(cursor.line, 2, line + nextLine);
        onChange?.(newLines.join("\n"));
      }
    }
    return true;
  }
}

/**
 * Handle printable character insertion.
 * Returns true if the event was handled.
 */
export function handleTextInsertion(
  event: KeyEvent,
  currentLines: string[],
  cursor: CursorPos,
  setCursor: React.Dispatch<React.SetStateAction<CursorPos>>,
  onChange: ((value: string) => void) | undefined,
  selectionAnchor: CursorPos | null,
  setSelectionAnchor: React.Dispatch<React.SetStateAction<CursorPos | null>>,
): boolean | undefined {
  if (
    event.key.length === 1 &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey
  ) {
    if (selectionAnchor) {
      // Delete selection, then insert at the resulting cursor
      const { newText, newCursor } = deleteSelection(currentLines, selectionAnchor, cursor);
      const newLines = newText.split("\n");
      const line = newLines[newCursor.line] ?? "";
      const insertedLine =
        line.slice(0, newCursor.col) + event.key + line.slice(newCursor.col);
      newLines[newCursor.line] = insertedLine;
      setCursor({ line: newCursor.line, col: newCursor.col + 1 });
      setSelectionAnchor(null);
      onChange?.(newLines.join("\n"));
    } else {
      const line = currentLines[cursor.line] ?? "";
      const newLine =
        line.slice(0, cursor.col) + event.key + line.slice(cursor.col);
      const newLines = [...currentLines];
      newLines[cursor.line] = newLine;
      setCursor((c) => ({ line: c.line, col: c.col + 1 }));
      onChange?.(newLines.join("\n"));
    }
    return true;
  }
}

import React, { useCallback, useEffect, useState } from "react";

import { Box, Text } from "../react/primitives.tsx";
import { useTheme } from "../react/theme.tsx";
import type { KeyEvent, PointerEvent } from "../core/events.ts";
import { useHover } from "../react/useHover.ts";
import { getBorderPropsWithHover, useFocusState } from "./shared.ts";
import { renderStyledLine } from "./text-rendering.tsx";
import { wordBoundaryLeft, wordBoundaryRight } from "./text-utils.ts";
import {
  type CursorPos,
  computeNavigation,
  cursorToOffset,
  getSelectionRange,
  handleEditing,
  handleTextInsertion,
  logicalToDisplayRow,
  wrapLine,
} from "./textarea-helpers.ts";

export interface TextAreaProps {
  value: string;
  onChange?: (value: string) => void;
  width: number;
  height: number;
  placeholder?: string;
  wrap?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
}

export function TextArea({
  value,
  onChange,
  width,
  height,
  placeholder,
  wrap = true,
  readOnly = false,
  disabled = false,
  "aria-label": ariaLabel,
}: TextAreaProps) {
  const theme = useTheme();
  const { focused, onFocus, onBlur: onBlurBase } = useFocusState();
  const { hovered, onPointerEnter, onPointerLeave } = useHover();
  const [cursor, setCursor] = useState<CursorPos>({ line: 0, col: 0 });
  const [scrollY, setScrollY] = useState(0);
  const [hScrollOffset, setHScrollOffset] = useState(0);
  const [selectionAnchor, setSelectionAnchor] = useState<CursorPos | null>(null);

  const onBlur = useCallback(() => {
    onBlurBase();
    setSelectionAnchor(null);
  }, [onBlurBase]);

  const innerWidth = Math.max(1, width - 2);
  const innerHeight = Math.max(1, height - 2);

  const lines = value.split("\n");

  // Clamp cursor when value changes externally.
  useEffect(() => {
    setCursor((prev) => {
      const line = Math.min(prev.line, lines.length - 1);
      const col = Math.min(prev.col, (lines[line] ?? "").length);
      return { line, col };
    });
    setSelectionAnchor((prev) => {
      if (!prev) return null;
      const newLines = value.split("\n");
      const line = Math.min(prev.line, newLines.length - 1);
      const col = Math.min(prev.col, newLines[line].length);
      return { line, col };
    });
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build display lines (with optional wrapping).
  const displayLines: { text: string; logicalLine: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (wrap) {
      const wrapped = wrapLine(lines[i], innerWidth);
      for (const sub of wrapped) {
        displayLines.push({ text: sub, logicalLine: i });
      }
    } else {
      displayLines.push({ text: lines[i], logicalLine: i });
    }
  }

  // Compute cursor display row for auto-scrolling.
  const cursorDisplayRow = logicalToDisplayRow(
    lines,
    cursor,
    innerWidth,
    wrap,
  );

  // Auto-scroll to keep cursor visible, accounting for scroll indicator rows.
  const totalDisplayLines = displayLines.length;
  useEffect(() => {
    setScrollY((prev) => {
      // Compute effective content rows for a given scrollY candidate
      const effectiveRows = (sy: number) => {
        const up = sy > 0 ? 1 : 0;
        const down = sy + innerHeight - up < totalDisplayLines ? 1 : 0;
        return Math.max(1, innerHeight - up - down);
      };
      const prevRows = effectiveRows(prev);
      if (cursorDisplayRow < prev) return cursorDisplayRow;
      if (cursorDisplayRow >= prev + prevRows) {
        const newSy = cursorDisplayRow - effectiveRows(cursorDisplayRow) + 1;
        return Math.max(0, newSy);
      }
      return prev;
    });
  }, [cursorDisplayRow, innerHeight, totalDisplayLines]);

  // Auto-scroll horizontally to keep cursor visible in non-wrap mode.
  useEffect(() => {
    if (wrap) return;
    setHScrollOffset((prev) => {
      if (cursor.col < prev) return cursor.col;
      if (cursor.col >= prev + innerWidth) return cursor.col - innerWidth + 1;
      return prev;
    });
  }, [wrap, cursor.col, innerWidth]);

  // Pre-compute content rows (how many display lines fit, excluding scroll indicators).
  const canScrollUpEarly = scrollY > 0;
  const upRowsEarly = canScrollUpEarly ? 1 : 0;
  const canScrollDownEarly = scrollY + (innerHeight - upRowsEarly) < displayLines.length;
  const indicatorRowsEarly = (canScrollUpEarly ? 1 : 0) + (canScrollDownEarly ? 1 : 0);
  const contentRows = Math.max(1, innerHeight - indicatorRowsEarly);

  // Compute click position as CursorPos from pointer event data.
  const computeClickCursor = useCallback(
    (event: PointerEvent): CursorPos | null => {
      const bounds = event.currentTargetBounds;
      if (!bounds) return null;
      // Account for border (1 col left, 1 row top) and scroll-up indicator
      const indicatorOffset = scrollY > 0 ? 1 : 0;
      const relCol = event.col - bounds.x - 1;
      const relRow = event.row - bounds.y - 1 - indicatorOffset;

      // Reject clicks on scroll indicator rows
      if (relRow < 0) return null;
      if (relRow >= contentRows) return null;

      const displayRow = scrollY + relRow;

      if (wrap) {
        // Walk display lines to find the logical line and column
        let displayIdx = 0;
        for (let i = 0; i < lines.length; i++) {
          const wrapped = wrapLine(lines[i], innerWidth);
          if (displayRow < displayIdx + wrapped.length) {
            const subLineIdx = displayRow - displayIdx;
            const col = Math.min(
              subLineIdx * innerWidth + relCol,
              lines[i].length,
            );
            return { line: i, col: Math.max(0, col) };
          }
          displayIdx += wrapped.length;
        }
      } else {
        // No wrapping: display row = logical line, translate relCol through hScrollOffset
        const line = Math.max(0, Math.min(lines.length - 1, displayRow));
        const col = Math.max(0, Math.min((lines[line] ?? "").length, relCol + hScrollOffset));
        return { line, col };
      }
      return null;
    },
    [scrollY, lines, innerWidth, wrap, contentRows, hScrollOffset],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      if (disabled) return;
      const clickPos = computeClickCursor(event);
      if (!clickPos) return;

      if (event.shiftKey) {
        // Shift+click extends selection
        if (!selectionAnchor) {
          setSelectionAnchor({ ...cursor });
        }
        setCursor(clickPos);
      } else {
        // Normal click clears selection
        setSelectionAnchor(null);
        setCursor(clickPos);
      }
      return true;
    },
    [disabled, computeClickCursor, selectionAnchor, cursor],
  );

  const handleKeyDown = useCallback(
    (event: KeyEvent) => {
      if (disabled) return;

      const currentLines = value.split("\n");
      const isShift = event.shiftKey;

      // Select all (Ctrl+A).
      if (event.ctrlKey && event.key === "a") {
        const lastLine = currentLines.length - 1;
        const lastLineLength = (currentLines[lastLine] ?? "").length;
        setSelectionAnchor({ line: 0, col: 0 });
        setCursor({ line: lastLine, col: lastLineLength });
        return true;
      }

      // Ctrl+Home: jump to start of document.
      if (event.ctrlKey && event.key === "Home") {
        const newCursor = { line: 0, col: 0 };
        if (isShift) {
          if (!selectionAnchor) setSelectionAnchor({ ...cursor });
        } else {
          setSelectionAnchor(null);
        }
        setCursor(newCursor);
        return true;
      }

      // Ctrl+End: jump to end of document.
      if (event.ctrlKey && event.key === "End") {
        const lastLine = currentLines.length - 1;
        const lastLineLength = (currentLines[lastLine] ?? "").length;
        const newCursor = { line: lastLine, col: lastLineLength };
        if (isShift) {
          if (!selectionAnchor) setSelectionAnchor({ ...cursor });
        } else {
          setSelectionAnchor(null);
        }
        setCursor(newCursor);
        return true;
      }

      // Ctrl+ArrowLeft: word navigation within current line.
      if (event.ctrlKey && event.key === "ArrowLeft") {
        const line = currentLines[cursor.line] ?? "";
        const newCol = wordBoundaryLeft(line, cursor.col);
        const newCursor = newCol !== cursor.col
          ? { line: cursor.line, col: newCol }
          : cursor.line > 0
            ? { line: cursor.line - 1, col: (currentLines[cursor.line - 1] ?? "").length }
            : cursor;
        if (isShift) {
          if (!selectionAnchor) setSelectionAnchor({ ...cursor });
        } else {
          setSelectionAnchor(null);
        }
        setCursor(newCursor);
        return true;
      }

      // Ctrl+ArrowRight: word navigation within current line.
      if (event.ctrlKey && event.key === "ArrowRight") {
        const line = currentLines[cursor.line] ?? "";
        const newCol = wordBoundaryRight(line, cursor.col);
        const newCursor = newCol !== cursor.col
          ? { line: cursor.line, col: newCol }
          : cursor.line < currentLines.length - 1
            ? { line: cursor.line + 1, col: 0 }
            : cursor;
        if (isShift) {
          if (!selectionAnchor) setSelectionAnchor({ ...cursor });
        } else {
          setSelectionAnchor(null);
        }
        setCursor(newCursor);
        return true;
      }

      // Page navigation (needs innerHeight from closure).
      if (event.key === "PageUp") {
        const newCursor = {
          line: Math.max(0, cursor.line - innerHeight),
          col: Math.min(cursor.col, (currentLines[Math.max(0, cursor.line - innerHeight)] ?? "").length),
        };
        if (isShift) {
          if (!selectionAnchor) setSelectionAnchor({ ...cursor });
        } else {
          setSelectionAnchor(null);
        }
        setCursor(newCursor);
        return true;
      }
      if (event.key === "PageDown") {
        const newLine = Math.min(currentLines.length - 1, cursor.line + innerHeight);
        const newCursor = {
          line: newLine,
          col: Math.min(cursor.col, (currentLines[newLine] ?? "").length),
        };
        if (isShift) {
          if (!selectionAnchor) setSelectionAnchor({ ...cursor });
        } else {
          setSelectionAnchor(null);
        }
        setCursor(newCursor);
        return true;
      }

      // Navigation keys (always available).
      const navTarget = computeNavigation(event.key, cursor, currentLines, wrap, innerWidth);
      if (navTarget !== undefined) {
        if (isShift) {
          // Shift+arrow: set anchor if not set, then move cursor
          if (!selectionAnchor) setSelectionAnchor({ ...cursor });
        } else {
          // Non-shift arrow: clear selection
          setSelectionAnchor(null);
        }
        setCursor(navTarget);
        return true;
      }

      if (readOnly) return;

      // Editing keys (Enter, Backspace, Delete).
      const editResult = handleEditing(event, currentLines, cursor, setCursor, onChange, selectionAnchor, setSelectionAnchor);
      if (editResult) return true;

      // Printable character insertion.
      return handleTextInsertion(event, currentLines, cursor, setCursor, onChange, selectionAnchor, setSelectionAnchor);
    },
    [disabled, readOnly, value, cursor, onChange, innerHeight, innerWidth, wrap, selectionAnchor],
  );

  // Border styling.
  const { borderStyle, borderColor: focusBorderColor } = getBorderPropsWithHover(focused, hovered, theme);

  const borderColor = disabled
    ? theme.colors.textDim
    : focusBorderColor;

  const textColor = disabled ? theme.colors.textDim : theme.colors.text;

  // Determine if we should show the placeholder.
  const showPlaceholder = value.length === 0 && placeholder && !focused;

  // Scroll indicators (contentRows already computed above for click handling).
  const canScrollUp = scrollY > 0;
  const canScrollDown = scrollY + contentRows < displayLines.length;

  // Build visible rows.
  const visibleDisplayLines = displayLines.slice(
    scrollY,
    scrollY + contentRows,
  );

  // Determine which display row the cursor is on within the visible window.
  const cursorVisibleRow = cursorDisplayRow - scrollY;

  // For the cursor's display column when wrapping:
  const cursorDisplayCol = wrap
    ? (() => {
        const mod = cursor.col % innerWidth;
        if (mod === 0 && cursor.col > 0 && cursor.col >= (lines[cursor.line] ?? "").length) {
          // Cursor at end of line at a sub-line boundary: display at rightmost column
          return innerWidth - 1;
        }
        return mod;
      })()
    : cursor.col - hScrollOffset;

  // Pre-compute selection range offsets for rendering.
  let selStartOffset = -1;
  let selEndOffset = -1;
  if (selectionAnchor && focused) {
    const range = getSelectionRange(selectionAnchor, cursor, lines);
    selStartOffset = range.startOffset;
    selEndOffset = range.endOffset;
  }
  const hasSelection = selStartOffset >= 0 && selStartOffset !== selEndOffset;

  const renderedLines: React.ReactNode[] = [];

  if (showPlaceholder) {
    renderedLines.push(
      <Text key="placeholder" italic color={theme.colors.textDim}>
        {(placeholder ?? "").slice(0, innerWidth).padEnd(innerWidth, " ")}
      </Text>,
    );
    // Fill remaining rows with empty lines.
    for (let i = 1; i < contentRows; i++) {
      renderedLines.push(
        <Text key={`empty-${i}`} color={textColor}>
          {" ".repeat(innerWidth)}
        </Text>,
      );
    }
  } else {
    for (let i = 0; i < contentRows; i++) {
      const dl = visibleDisplayLines[i];
      if (!dl) {
        // Empty row past end of content.
        renderedLines.push(
          <Text key={`empty-${i}`} color={textColor}>
            {" ".repeat(innerWidth)}
          </Text>,
        );
        continue;
      }

      const lineText = wrap
        ? dl.text.slice(0, innerWidth).padEnd(innerWidth, " ")
        : dl.text.slice(hScrollOffset, hScrollOffset + innerWidth).padEnd(innerWidth, " ");

      // Compute the flat offset range for this display line.
      // We need to determine which logical offset each character in this display line maps to.
      const globalDisplayRow = scrollY + i;
      let displayLineStartOffset = 0;
      if (wrap) {
        // Walk display lines to find the offset of the first char in this display line
        let dRow = 0;
        for (let li = 0; li < lines.length; li++) {
          const wrapped = wrapLine(lines[li], innerWidth);
          if (globalDisplayRow < dRow + wrapped.length) {
            const subIdx = globalDisplayRow - dRow;
            displayLineStartOffset = cursorToOffset({ line: li, col: subIdx * innerWidth }, lines);
            break;
          }
          dRow += wrapped.length;
        }
      } else {
        displayLineStartOffset = cursorToOffset({ line: dl.logicalLine, col: hScrollOffset }, lines);
      }

      // Check if this row has any selection or cursor
      const hasCursorOnRow = focused && i === cursorVisibleRow && cursorDisplayCol >= 0 && cursorDisplayCol < innerWidth;
      const rowEndOffset = displayLineStartOffset + lineText.length;
      const hasSelectionOnRow = hasSelection && selStartOffset < rowEndOffset && selEndOffset > displayLineStartOffset;

      if (hasCursorOnRow || hasSelectionOnRow) {
        const segments = renderStyledLine({
          lineText,
          innerWidth,
          charOffsetBase: displayLineStartOffset,
          cursorCol: hasCursorOnRow ? cursorDisplayCol : null,
          selStart: selStartOffset,
          selEnd: selEndOffset,
          textColor,
          primaryColor: theme.colors.primary,
        });
        renderedLines.push(
          <Box key={`line-${i}`} flexDirection="row">
            {segments}
          </Box>,
        );
      } else {
        renderedLines.push(
          <Text key={`line-${i}`} color={textColor}>
            {lineText}
          </Text>,
        );
      }
    }
  }

  return (
    <Box
      width={width}
      height={height}
      border
      borderStyle={borderStyle}
      color={borderColor}
      focusable={!disabled}
      cursor={disabled ? undefined : "text"}
      role="textbox"
      aria-multiline={true}
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onFocus={onFocus}
      onBlur={onBlur}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {canScrollUp && (
        <Text color={theme.colors.textDim}>
          {"\u25B2".padStart(Math.floor(innerWidth / 2) + 1).padEnd(innerWidth)}
        </Text>
      )}
      {renderedLines}
      {canScrollDown && (
        <Text color={theme.colors.textDim}>
          {"\u25BC".padStart(Math.floor(innerWidth / 2) + 1).padEnd(innerWidth)}
        </Text>
      )}
    </Box>
  );
}

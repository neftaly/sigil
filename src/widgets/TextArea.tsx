import React, { useCallback, useEffect, useState } from "react";

import { Box, Text } from "../react/primitives.tsx";
import { useTheme } from "../react/theme.tsx";
import type { KeyEvent } from "../core/events.ts";
import { useFocusState, getBorderProps } from "./shared.ts";

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

interface CursorPos {
  line: number;
  col: number;
}

/**
 * Wrap a single line to fit within maxWidth, returning the wrapped sub-lines.
 */
function wrapLine(line: string, maxWidth: number): string[] {
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
function logicalToDisplayRow(
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
    displayRow += Math.floor(cursor.col / maxWidth);
  }
  return displayRow;
}

/**
 * Handle navigation keys: ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Home, End.
 * Returns true if the event was handled.
 */
function handleNavigation(
  event: KeyEvent,
  currentLines: string[],
  setCursor: React.Dispatch<React.SetStateAction<CursorPos>>,
): boolean | undefined {
  if (event.key === "ArrowLeft") {
    setCursor((c) => {
      if (c.col > 0) return { line: c.line, col: c.col - 1 };
      if (c.line > 0) {
        const prevLine = currentLines[c.line - 1] ?? "";
        return { line: c.line - 1, col: prevLine.length };
      }
      return c;
    });
    return true;
  }

  if (event.key === "ArrowRight") {
    setCursor((c) => {
      const currentLine = currentLines[c.line] ?? "";
      if (c.col < currentLine.length)
        return { line: c.line, col: c.col + 1 };
      if (c.line < currentLines.length - 1)
        return { line: c.line + 1, col: 0 };
      return c;
    });
    return true;
  }

  if (event.key === "ArrowUp") {
    setCursor((c) => {
      if (c.line > 0) {
        const prevLine = currentLines[c.line - 1] ?? "";
        return { line: c.line - 1, col: Math.min(c.col, prevLine.length) };
      }
      return c;
    });
    return true;
  }

  if (event.key === "ArrowDown") {
    setCursor((c) => {
      if (c.line < currentLines.length - 1) {
        const nextLine = currentLines[c.line + 1] ?? "";
        return { line: c.line + 1, col: Math.min(c.col, nextLine.length) };
      }
      return c;
    });
    return true;
  }

  if (event.key === "Home") {
    setCursor((c) => ({ line: c.line, col: 0 }));
    return true;
  }

  if (event.key === "End") {
    setCursor((c) => ({
      line: c.line,
      col: (currentLines[c.line] ?? "").length,
    }));
    return true;
  }
}

/**
 * Handle editing keys: Enter, Backspace, Delete.
 * Returns true if the event was handled.
 */
function handleEditing(
  event: KeyEvent,
  currentLines: string[],
  cursor: CursorPos,
  setCursor: React.Dispatch<React.SetStateAction<CursorPos>>,
  onChange: ((value: string) => void) | undefined,
): boolean | undefined {
  if (event.key === "Enter") {
    const line = currentLines[cursor.line] ?? "";
    const before = line.slice(0, cursor.col);
    const after = line.slice(cursor.col);
    const newLines = [...currentLines];
    newLines.splice(cursor.line, 1, before, after);
    setCursor({ line: cursor.line + 1, col: 0 });
    onChange?.(newLines.join("\n"));
    return true;
  }

  if (event.key === "Backspace") {
    if (cursor.col > 0) {
      const line = currentLines[cursor.line] ?? "";
      const newLine =
        line.slice(0, cursor.col - 1) + line.slice(cursor.col);
      const newLines = [...currentLines];
      newLines[cursor.line] = newLine;
      setCursor((c) => ({ line: c.line, col: c.col - 1 }));
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
    const line = currentLines[cursor.line] ?? "";
    if (cursor.col < line.length) {
      const newLine =
        line.slice(0, cursor.col) + line.slice(cursor.col + 1);
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
    return true;
  }
}

/**
 * Handle printable character insertion.
 * Returns true if the event was handled.
 */
function handleTextInsertion(
  event: KeyEvent,
  currentLines: string[],
  cursor: CursorPos,
  setCursor: React.Dispatch<React.SetStateAction<CursorPos>>,
  onChange: ((value: string) => void) | undefined,
): boolean | undefined {
  if (
    event.key.length === 1 &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey
  ) {
    const line = currentLines[cursor.line] ?? "";
    const newLine =
      line.slice(0, cursor.col) + event.key + line.slice(cursor.col);
    const newLines = [...currentLines];
    newLines[cursor.line] = newLine;
    setCursor((c) => ({ line: c.line, col: c.col + 1 }));
    onChange?.(newLines.join("\n"));
    return true;
  }
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
  const { focused, onFocus, onBlur } = useFocusState();
  const [cursor, setCursor] = useState<CursorPos>({ line: 0, col: 0 });
  const [scrollY, setScrollY] = useState(0);

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

  // Auto-scroll to keep cursor visible.
  useEffect(() => {
    setScrollY((prev) => {
      if (cursorDisplayRow < prev) return cursorDisplayRow;
      if (cursorDisplayRow >= prev + innerHeight)
        return cursorDisplayRow - innerHeight + 1;
      return prev;
    });
  }, [cursorDisplayRow, innerHeight]);

  const handleKeyDown = useCallback(
    (event: KeyEvent) => {
      if (disabled) return;

      const currentLines = value.split("\n");

      // Navigation keys (always available).
      const navResult = handleNavigation(event, currentLines, setCursor);
      if (navResult) return true;

      if (readOnly) return;

      // Editing keys (Enter, Backspace, Delete).
      const editResult = handleEditing(event, currentLines, cursor, setCursor, onChange);
      if (editResult) return true;

      // Printable character insertion.
      return handleTextInsertion(event, currentLines, cursor, setCursor, onChange);
    },
    [disabled, readOnly, value, cursor, onChange],
  );

  // Border styling.
  const { borderStyle, borderColor: focusBorderColor } = getBorderProps(focused, theme);

  const borderColor = disabled
    ? theme.colors.textDim
    : focusBorderColor;

  const textColor = disabled ? theme.colors.textDim : theme.colors.text;

  // Determine if we should show the placeholder.
  const showPlaceholder = value.length === 0 && placeholder && !focused;

  // Scroll indicators.
  const canScrollUp = scrollY > 0;
  const canScrollDown = scrollY + innerHeight < displayLines.length;

  // Build visible rows.
  const visibleDisplayLines = displayLines.slice(
    scrollY,
    scrollY + innerHeight,
  );

  // Determine which display row the cursor is on within the visible window.
  const cursorVisibleRow = cursorDisplayRow - scrollY;

  // For the cursor's display column when wrapping:
  const cursorDisplayCol = wrap
    ? cursor.col % innerWidth
    : cursor.col;

  const renderedLines: React.ReactNode[] = [];

  if (showPlaceholder) {
    renderedLines.push(
      <Text key="placeholder" italic color={theme.colors.textDim}>
        {(placeholder ?? "").slice(0, innerWidth).padEnd(innerWidth, " ")}
      </Text>,
    );
    // Fill remaining rows with empty lines.
    for (let i = 1; i < innerHeight; i++) {
      renderedLines.push(
        <Text key={`empty-${i}`} color={textColor}>
          {" ".repeat(innerWidth)}
        </Text>,
      );
    }
  } else {
    for (let i = 0; i < innerHeight; i++) {
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

      const lineText = dl.text.slice(0, innerWidth).padEnd(innerWidth, " ");

      // Check if cursor is on this visible row.
      if (
        focused &&
        i === cursorVisibleRow &&
        cursorDisplayCol >= 0 &&
        cursorDisplayCol < innerWidth
      ) {
        const before = lineText.slice(0, cursorDisplayCol);
        const cursorChar = lineText[cursorDisplayCol] ?? " ";
        const after = lineText.slice(cursorDisplayCol + 1);

        renderedLines.push(
          <Box key={`line-${i}`} flexDirection="row">
            {before.length > 0 && (
              <Text color={textColor}>{before}</Text>
            )}
            <Text
              color={theme.colors.primary}
              backgroundColor={textColor}
              bold
            >
              {cursorChar}
            </Text>
            {after.length > 0 && <Text color={textColor}>{after}</Text>}
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
      role="textbox"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
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

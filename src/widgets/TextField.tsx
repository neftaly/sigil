import React, { useCallback, useEffect, useState } from "react";

import { Box, Text } from "../react/primitives.tsx";
import { useTheme } from "../react/theme.tsx";
import type { KeyEvent, PointerEvent } from "../core/events.ts";
import { useHover } from "../react/useHover.ts";
import { getBorderPropsWithHover, useFocusState } from "./shared.ts";
import { renderStyledLine } from "./text-rendering.tsx";
import {
  moveBackCount,
  moveForwardCount,
  snapToCharBoundary,
  wordBoundaryLeft,
  wordBoundaryRight,
} from "./text-utils.ts";

export interface TextFieldProps {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  width: number;
  echoMode?: "normal" | "password" | "none";
  charLimit?: number;
  readOnly?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
}

function getSelectionBounds(anchor: number, cursor: number): [number, number] {
  return anchor < cursor ? [anchor, cursor] : [cursor, anchor];
}

export function TextField({
  value,
  onChange,
  placeholder,
  width,
  echoMode = "normal",
  charLimit,
  readOnly = false,
  disabled = false,
  "aria-label": ariaLabel,
}: TextFieldProps) {
  const theme = useTheme();
  const { focused, onFocus, onBlur: onBlurBase } = useFocusState();
  const { hovered, onPointerEnter, onPointerLeave } = useHover();
  const [cursor, setCursor] = useState(value.length);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null);

  const onBlur = useCallback(() => {
    onBlurBase();
    setSelectionAnchor(null);
  }, [onBlurBase]);

  // Clamp cursor when value changes externally.
  useEffect(() => {
    setCursor((prev) => Math.min(prev, value.length));
    setSelectionAnchor((prev) =>
      prev !== null ? Math.min(prev, value.length) : null
    );
  }, [value]);

  // The inner width available for text (accounting for border).
  const innerWidth = Math.max(1, width - 2);

  // Ensure cursor is visible by adjusting scroll offset.
  useEffect(() => {
    setScrollOffset((prev) => {
      if (cursor < prev) return cursor;
      if (cursor >= prev + innerWidth) return cursor - innerWidth + 1;
      return prev;
    });
  }, [cursor, innerWidth]);

  const handleKeyDown = useCallback(
    (event: KeyEvent) => {
      if (disabled) return;

      const isShift = event.shiftKey;

      // Select all (Ctrl+A).
      if (event.ctrlKey && event.key === "a") {
        setSelectionAnchor(0);
        setCursor(value.length);
        return true;
      }

      // Ctrl+ArrowLeft: word navigation.
      if (event.ctrlKey && event.key === "ArrowLeft") {
        const newPos = snapToCharBoundary(value, wordBoundaryLeft(value, cursor));
        if (isShift) {
          if (selectionAnchor === null) setSelectionAnchor(cursor);
        } else {
          setSelectionAnchor(null);
        }
        setCursor(newPos);
        return true;
      }

      // Ctrl+ArrowRight: word navigation.
      if (event.ctrlKey && event.key === "ArrowRight") {
        const newPos = snapToCharBoundary(value, wordBoundaryRight(value, cursor));
        if (isShift) {
          if (selectionAnchor === null) setSelectionAnchor(cursor);
        } else {
          setSelectionAnchor(null);
        }
        setCursor(newPos);
        return true;
      }

      // ArrowLeft.
      if (event.key === "ArrowLeft") {
        const newPos = Math.max(0, cursor - moveBackCount(value, cursor));
        if (isShift) {
          if (selectionAnchor === null) setSelectionAnchor(cursor);
        } else {
          setSelectionAnchor(null);
        }
        setCursor(newPos);
        return true;
      }

      // ArrowRight.
      if (event.key === "ArrowRight") {
        const newPos = Math.min(value.length, cursor + moveForwardCount(value, cursor));
        if (isShift) {
          if (selectionAnchor === null) setSelectionAnchor(cursor);
        } else {
          setSelectionAnchor(null);
        }
        setCursor(newPos);
        return true;
      }

      // Home.
      if (event.key === "Home") {
        if (isShift) {
          if (selectionAnchor === null) setSelectionAnchor(cursor);
        } else {
          setSelectionAnchor(null);
        }
        setCursor(0);
        return true;
      }

      // End.
      if (event.key === "End") {
        if (isShift) {
          if (selectionAnchor === null) setSelectionAnchor(cursor);
        } else {
          setSelectionAnchor(null);
        }
        setCursor(value.length);
        return true;
      }

      if (readOnly) return;

      // Ctrl+Backspace: delete word backward.
      if (event.ctrlKey && event.key === "Backspace") {
        if (selectionAnchor !== null) {
          const [start, end] = getSelectionBounds(selectionAnchor, cursor);
          const newValue = value.slice(0, start) + value.slice(end);
          setCursor(start);
          setSelectionAnchor(null);
          onChange?.(newValue);
        } else if (cursor > 0) {
          const boundary = wordBoundaryLeft(value, cursor);
          const newValue = value.slice(0, boundary) + value.slice(cursor);
          setCursor(boundary);
          onChange?.(newValue);
        }
        return true;
      }

      // Ctrl+Delete: delete word forward.
      if (event.ctrlKey && event.key === "Delete") {
        if (selectionAnchor !== null) {
          const [start, end] = getSelectionBounds(selectionAnchor, cursor);
          const newValue = value.slice(0, start) + value.slice(end);
          setCursor(start);
          setSelectionAnchor(null);
          onChange?.(newValue);
        } else if (cursor < value.length) {
          const boundary = wordBoundaryRight(value, cursor);
          const newValue = value.slice(0, cursor) + value.slice(boundary);
          onChange?.(newValue);
        }
        return true;
      }

      // Backspace.
      if (event.key === "Backspace") {
        if (selectionAnchor !== null) {
          const [start, end] = getSelectionBounds(selectionAnchor, cursor);
          const newValue = value.slice(0, start) + value.slice(end);
          setCursor(start);
          setSelectionAnchor(null);
          onChange?.(newValue);
        } else if (cursor > 0) {
          const count = moveBackCount(value, cursor);
          const newValue =
            value.slice(0, cursor - count) + value.slice(cursor);
          setCursor((c) => c - count);
          onChange?.(newValue);
        }
        return true;
      }

      // Delete.
      if (event.key === "Delete") {
        if (selectionAnchor !== null) {
          const [start, end] = getSelectionBounds(selectionAnchor, cursor);
          const newValue = value.slice(0, start) + value.slice(end);
          setCursor(start);
          setSelectionAnchor(null);
          onChange?.(newValue);
        } else if (cursor < value.length) {
          const count = moveForwardCount(value, cursor);
          const newValue =
            value.slice(0, cursor) + value.slice(cursor + count);
          onChange?.(newValue);
        }
        return true;
      }

      // Printable character insertion.
      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        if (selectionAnchor !== null) {
          const [start, end] = getSelectionBounds(selectionAnchor, cursor);
          const newValue = value.slice(0, start) + event.key + value.slice(end);
          if (charLimit !== undefined && newValue.length > charLimit) {
            return true;
          }
          setCursor(start + 1);
          setSelectionAnchor(null);
          onChange?.(newValue);
        } else {
          if (charLimit !== undefined && value.length >= charLimit) {
            return true;
          }
          const newValue =
            value.slice(0, cursor) + event.key + value.slice(cursor);
          setCursor((c) => c + 1);
          onChange?.(newValue);
        }
        return true;
      }
    },
    [disabled, readOnly, value, cursor, charLimit, onChange, selectionAnchor],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      if (disabled) return;
      const bounds = event.currentTargetBounds;
      if (!bounds) return;
      // Account for left border (1 col)
      const relCol = event.col - bounds.x - 1;
      const newCursor = Math.max(0, Math.min(value.length, scrollOffset + relCol));

      if (event.shiftKey) {
        // Shift+click extends selection
        if (selectionAnchor === null) {
          setSelectionAnchor(cursor);
        }
        setCursor(newCursor);
      } else {
        // Normal click clears selection
        setSelectionAnchor(null);
        setCursor(newCursor);
      }
      return true;
    },
    [disabled, value.length, scrollOffset, selectionAnchor, cursor],
  );

  // Build the display string based on echo mode.
  let displayText: string;
  if (echoMode === "password") {
    displayText = "\u2022".repeat(value.length);
  } else if (echoMode === "none") {
    displayText = "";
  } else {
    displayText = value;
  }

  // Determine if we should show the placeholder.
  const showPlaceholder = value.length === 0 && placeholder && !focused;

  // Compute the visible window of text.
  const visibleText = displayText.slice(
    scrollOffset,
    scrollOffset + innerWidth,
  );

  // Pad to fill the inner width.
  const paddedText = visibleText.padEnd(innerWidth, " ");

  // Cursor position relative to the visible window.
  const cursorInView = cursor - scrollOffset;

  // Border styling.
  const { borderStyle, borderColor: focusBorderColor } = getBorderPropsWithHover(focused, hovered, theme);

  const borderColor = disabled
    ? theme.colors.textDim
    : focusBorderColor;

  const textColor = disabled ? theme.colors.textDim : theme.colors.text;

  // Pre-compute selection bounds for rendering.
  let selStart = -1;
  let selEnd = -1;
  if (selectionAnchor !== null && focused) {
    [selStart, selEnd] = getSelectionBounds(selectionAnchor, cursor);
  }
  const hasSelection = selStart >= 0 && selStart !== selEnd;

  // Render content.
  let content: React.ReactNode;
  if (showPlaceholder) {
    content = (
      <Text italic color={theme.colors.textDim}>
        {(placeholder ?? "").slice(0, innerWidth).padEnd(innerWidth, " ")}
      </Text>
    );
  } else if (focused && (hasSelection || (cursorInView >= 0 && cursorInView < innerWidth))) {
    const segments = renderStyledLine({
      lineText: paddedText,
      innerWidth,
      charOffsetBase: scrollOffset,
      cursorCol: cursorInView >= 0 && cursorInView < innerWidth ? cursorInView : null,
      selStart,
      selEnd,
      textColor,
      primaryColor: theme.colors.primary,
    });
    content = (
      <Box flexDirection="row">
        {segments}
      </Box>
    );
  } else {
    content = <Text color={textColor}>{paddedText}</Text>;
  }

  return (
    <Box
      width={width}
      height={3}
      border
      borderStyle={borderStyle}
      color={borderColor}
      focusable={!disabled}
      cursor={disabled ? undefined : "text"}
      role="textbox"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onFocus={onFocus}
      onBlur={onBlur}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {content}
    </Box>
  );
}

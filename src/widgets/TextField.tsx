import React, { useCallback, useEffect, useState } from "react";

import { Box, Text } from "../react/primitives.tsx";
import { useTheme } from "../react/theme.tsx";
import type { KeyEvent } from "../core/events.ts";
import { getBorderProps, useFocusState } from "./shared.ts";

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
  const { focused, onFocus, onBlur } = useFocusState();
  const [cursor, setCursor] = useState(value.length);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Clamp cursor when value changes externally.
  useEffect(() => {
    setCursor((prev) => Math.min(prev, value.length));
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

      if (event.key === "ArrowLeft") {
        setCursor((c) => Math.max(0, c - 1));
        return true;
      }
      if (event.key === "ArrowRight") {
        setCursor((c) => Math.min(value.length, c + 1));
        return true;
      }
      if (event.key === "Home") {
        setCursor(0);
        return true;
      }
      if (event.key === "End") {
        setCursor(value.length);
        return true;
      }

      if (readOnly) return;

      if (event.key === "Backspace") {
        if (cursor > 0) {
          const newValue =
            value.slice(0, cursor - 1) + value.slice(cursor);
          setCursor((c) => c - 1);
          onChange?.(newValue);
        }
        return true;
      }
      if (event.key === "Delete") {
        if (cursor < value.length) {
          const newValue =
            value.slice(0, cursor) + value.slice(cursor + 1);
          onChange?.(newValue);
        }
        return true;
      }

      // Printable character insertion.
      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        if (charLimit !== undefined && value.length >= charLimit) {
          return true;
        }
        const newValue =
          value.slice(0, cursor) + event.key + value.slice(cursor);
        setCursor((c) => c + 1);
        onChange?.(newValue);
        return true;
      }
    },
    [disabled, readOnly, value, cursor, charLimit, onChange],
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
  const { borderStyle, borderColor: focusBorderColor } = getBorderProps(focused, theme);

  const borderColor = disabled
    ? theme.colors.textDim
    : focusBorderColor;

  const textColor = disabled ? theme.colors.textDim : theme.colors.text;

  // Render content.
  let content: React.ReactNode;
  if (showPlaceholder) {
    content = (
      <Text italic color={theme.colors.textDim}>
        {(placeholder ?? "").slice(0, innerWidth).padEnd(innerWidth, " ")}
      </Text>
    );
  } else if (focused && cursorInView >= 0 && cursorInView < innerWidth) {
    // Split into before cursor, cursor char, after cursor.
    const before = paddedText.slice(0, cursorInView);
    const cursorChar = paddedText[cursorInView] ?? " ";
    const after = paddedText.slice(cursorInView + 1);

    content = (
      <Box flexDirection="row">
        {before.length > 0 && <Text color={textColor}>{before}</Text>}
        <Text
          color={theme.colors.primary}
          backgroundColor={textColor}
          bold
        >
          {cursorChar}
        </Text>
        {after.length > 0 && <Text color={textColor}>{after}</Text>}
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
      role="textbox"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {content}
    </Box>
  );
}

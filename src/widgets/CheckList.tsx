import React, { useCallback, useState } from "react";

import { Box, Text } from "../react/primitives.tsx";
import { useTheme } from "../react/theme.tsx";
import type { KeyEvent } from "../core/events.ts";
import { useFocusState, getBorderProps, getTextColor, useScrollWindow } from "./shared.ts";

export interface CheckListProps {
  value: string[];
  onChange?: (value: string[]) => void;
  options: Array<{ value: string; label: string }>;
  height?: number;
  limit?: number;
  disabled?: boolean;
}

export function CheckList({
  value,
  onChange,
  options,
  height = 4,
  limit,
  disabled = false,
}: CheckListProps) {
  const theme = useTheme();
  const { focused, onFocus, onBlur } = useFocusState();
  const [focusIndex, setFocusIndex] = useState(0);
  const { scrollOffset, ensureVisible } = useScrollWindow(height);

  const toggleItem = useCallback(
    (itemValue: string) => {
      if (disabled) return;
      const isChecked = value.includes(itemValue);
      if (isChecked) {
        onChange?.(value.filter((v) => v !== itemValue));
      } else {
        if (limit !== undefined && value.length >= limit) return;
        onChange?.([...value, itemValue]);
      }
    },
    [disabled, value, onChange, limit],
  );

  const handleKeyDown = useCallback(
    (event: KeyEvent) => {
      if (disabled) return;
      switch (event.key) {
        case "ArrowUp":
          setFocusIndex((i) => {
            const next = Math.max(0, i - 1);
            ensureVisible(next);
            return next;
          });
          return true;
        case "ArrowDown":
          setFocusIndex((i) => {
            const next = Math.min(options.length - 1, i + 1);
            ensureVisible(next);
            return next;
          });
          return true;
        case "Home":
          setFocusIndex(0);
          ensureVisible(0);
          return true;
        case "End": {
          const last = options.length - 1;
          setFocusIndex(last);
          ensureVisible(last);
          return true;
        }
        case "Enter":
        case " ":
          toggleItem(options[focusIndex].value);
          return true;
      }
    },
    [disabled, options, focusIndex, toggleItem, ensureVisible],
  );

  const { borderStyle, borderColor } = getBorderProps(focused, theme);

  const visibleOptions = options.slice(scrollOffset, scrollOffset + height);
  const hasMoreAbove = scrollOffset > 0;
  const hasMoreBelow = scrollOffset + height < options.length;

  return (
    <Box
      border
      borderStyle={borderStyle}
      color={borderColor}
      height={height + 2}
      focusable={!disabled}
      role="listbox"
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {hasMoreAbove && (
        <Text color={theme.colors.textDim}>{"\u25B2"}</Text>
      )}
      {visibleOptions.map((option, vi) => {
        const actualIndex = scrollOffset + vi;
        const isChecked = value.includes(option.value);
        const isFocusedItem = focused && actualIndex === focusIndex;

        let indicator: string;
        if (isFocusedItem) {
          indicator = "[\u25B8]";
        } else if (isChecked) {
          indicator = "[x]";
        } else {
          indicator = "[ ]";
        }

        const itemColor = isFocusedItem
          ? theme.colors.primary
          : isChecked
            ? theme.colors.primary
            : disabled
              ? theme.colors.textDim
              : theme.colors.text;

        return (
          <Box
            key={option.value}
            flexDirection="row"
            aria-selected={isChecked}
          >
            <Text
              color={itemColor}
              bold={isFocusedItem}
              italic={disabled}
            >
              {indicator} {option.label}
            </Text>
          </Box>
        );
      })}
      {hasMoreBelow && (
        <Text color={theme.colors.textDim}>{"\u25BC"}</Text>
      )}
    </Box>
  );
}

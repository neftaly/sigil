import React, { useCallback, useState } from "react";

import { Box, Text } from "../react/primitives.tsx";
import { useTheme } from "../react/theme.tsx";
import type { KeyEvent } from "../core/events.ts";

export interface RadioGroupProps {
  value: string;
  onChange?: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}

export function RadioGroup({
  value,
  onChange,
  options,
  disabled = false,
}: RadioGroupProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);

  const handleKeyDown = useCallback(
    (event: KeyEvent) => {
      if (disabled) return;
      switch (event.key) {
        case "ArrowUp":
          setFocusIndex((i) => Math.max(0, i - 1));
          return true;
        case "ArrowDown":
          setFocusIndex((i) => Math.min(options.length - 1, i + 1));
          return true;
        case "Enter":
        case " ":
          onChange?.(options[focusIndex].value);
          return true;
      }
    },
    [disabled, onChange, options, focusIndex],
  );

  const handleFocus = useCallback(() => {
    setFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setFocused(false);
  }, []);

  const textColor = disabled
    ? theme.colors.textDim
    : theme.colors.text;

  return (
    <Box
      focusable={!disabled}
      role="radiogroup"
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {options.map((option, i) => {
        const isSelected = option.value === value;
        const isFocusedItem = focused && i === focusIndex;
        const indicator = isSelected ? "(\u25CF)" : "( )";
        const cursor = isFocusedItem ? "\u25B8 " : "  ";
        const itemColor = isFocusedItem
          ? theme.colors.primary
          : textColor;

        return (
          <Box
            key={option.value}
            flexDirection="row"
            aria-checked={isSelected}
          >
            <Text color={itemColor} italic={disabled}>
              {cursor}{indicator} {option.label}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

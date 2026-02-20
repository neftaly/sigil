import React, { useCallback } from "react";

import { Box, Text } from "../react/primitives.tsx";
import { useTheme } from "../react/theme.tsx";
import type { KeyEvent } from "../core/events.ts";
import { useFocusState, getTextColor } from "./shared.ts";

export interface NumberInputProps {
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
}

export function NumberInput({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  label,
  disabled = false,
}: NumberInputProps) {
  const theme = useTheme();
  const { focused, onFocus, onBlur } = useFocusState();

  const clamp = useCallback(
    (v: number) => Math.max(min, Math.min(max, v)),
    [min, max],
  );

  const increment = useCallback(() => {
    if (disabled) return;
    const next = clamp(value + step);
    if (next !== value) onChange?.(next);
  }, [disabled, value, step, clamp, onChange]);

  const decrement = useCallback(() => {
    if (disabled) return;
    const next = clamp(value - step);
    if (next !== value) onChange?.(next);
  }, [disabled, value, step, clamp, onChange]);

  const handleKeyDown = useCallback(
    (event: KeyEvent) => {
      if (disabled) return;
      switch (event.key) {
        case "ArrowRight":
        case "ArrowUp":
          increment();
          return true;
        case "ArrowLeft":
        case "ArrowDown":
          decrement();
          return true;
        case "Home":
          if (min !== -Infinity) {
            onChange?.(min);
            return true;
          }
          break;
        case "End":
          if (max !== Infinity) {
            onChange?.(max);
            return true;
          }
          break;
      }
    },
    [disabled, increment, decrement, min, max, onChange],
  );

  const atMin = value <= min;
  const atMax = value >= max;

  const leftArrowColor = disabled || atMin
    ? theme.colors.textDim
    : theme.colors.text;
  const rightArrowColor = disabled || atMax
    ? theme.colors.textDim
    : theme.colors.text;

  const valueColor = getTextColor({ disabled, focused }, theme);

  const valueStr = String(value);
  const display = focused
    ? `\u25C0[ ${valueStr} ]\u25B6`
    : `\u25C0  ${valueStr}  \u25B6`;

  return (
    <Box
      flexDirection="row"
      focusable={!disabled}
      role="spinbutton"
      aria-valuenow={value}
      aria-valuemin={min !== -Infinity ? min : undefined}
      aria-valuemax={max !== Infinity ? max : undefined}
      aria-label={label}
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <Text color={leftArrowColor}>{"\u25C0"}</Text>
      {focused ? (
        <Text color={valueColor} bold>{"[ "}{valueStr}{" ]"}</Text>
      ) : (
        <Text color={valueColor}>{"  "}{valueStr}{"  "}</Text>
      )}
      <Text color={rightArrowColor}>{"\u25B6"}</Text>
      {label && <Text color={valueColor}>{" "}{label}</Text>}
    </Box>
  );
}

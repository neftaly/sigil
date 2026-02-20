import React, { useCallback, useState } from "react";

import { Box, Text } from "../react/primitives.tsx";
import { useTheme } from "../react/theme.tsx";
import type { KeyEvent, PointerEvent } from "../core/events.ts";

export interface SliderProps {
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  width: number;
  showLabel?: boolean;
  disabled?: boolean;
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  width,
  showLabel = false,
  disabled = false,
}: SliderProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const clamp = useCallback(
    (v: number) => Math.max(min, Math.min(max, v)),
    [min, max],
  );

  const snap = useCallback(
    (v: number) => {
      const snapped = Math.round((v - min) / step) * step + min;
      return clamp(snapped);
    },
    [min, step, clamp],
  );

  const handleKeyDown = useCallback(
    (event: KeyEvent) => {
      if (disabled) return;
      switch (event.key) {
        case "ArrowRight":
        case "ArrowUp": {
          const next = clamp(value + step);
          if (next !== value) onChange?.(next);
          return true;
        }
        case "ArrowLeft":
        case "ArrowDown": {
          const next = clamp(value - step);
          if (next !== value) onChange?.(next);
          return true;
        }
        case "Home":
          onChange?.(min);
          return true;
        case "End":
          onChange?.(max);
          return true;
      }
    },
    [disabled, value, step, min, max, clamp, onChange],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      if (disabled) return;
      const bounds = event.targetBounds;
      if (!bounds) return;
      const relativeCol = event.col - bounds.x;
      const barWidth = width - 2;
      const ratio = Math.max(0, Math.min(1, (relativeCol - 1) / barWidth));
      const newValue = snap(min + ratio * (max - min));
      onChange?.(newValue);
      return true;
    },
    [disabled, width, min, max, snap, onChange],
  );

  const handleFocus = useCallback(() => {
    setFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setFocused(false);
  }, []);

  const ratio = max === min ? 0 : (value - min) / (max - min);
  const barWidth = width - 2; // subtract end caps
  const filledCount = Math.round(ratio * barWidth);
  const emptyCount = barWidth - filledCount;

  const leftCap = focused ? "\u255E" : "\u251C";
  const rightCap = focused ? "\u2561" : "\u2524";

  const barColor = disabled
    ? theme.colors.textDim
    : focused
      ? theme.colors.primary
      : theme.colors.text;

  const filledChar = "\u2588";
  const emptyChar = "\u2591";

  const labelText = showLabel ? ` ${value}` : "";

  return (
    <Box
      flexDirection="row"
      width={width + (showLabel ? String(value).length + 1 : 0)}
      focusable={!disabled}
      role="slider"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <Text color={barColor}>
        {leftCap}
      </Text>
      <Text color={disabled ? theme.colors.textDim : theme.colors.filled}>
        {filledChar.repeat(filledCount)}
      </Text>
      <Text color={disabled ? theme.colors.textDim : theme.colors.empty}>
        {emptyChar.repeat(emptyCount)}
      </Text>
      <Text color={barColor}>
        {rightCap}
      </Text>
      {showLabel && (
        <Text color={barColor}>{labelText}</Text>
      )}
    </Box>
  );
}

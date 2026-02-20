import React, { useCallback, useState } from "react";

import { Box, Text } from "../react/primitives.tsx";
import { useTheme } from "../react/theme.tsx";
import type { KeyEvent } from "../core/events.ts";

export interface ToggleProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: ToggleProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const toggle = useCallback(() => {
    if (disabled) return;
    onChange?.(!checked);
  }, [disabled, onChange, checked]);

  const handleKeyDown = useCallback(
    (event: KeyEvent) => {
      if (disabled) return;
      if (event.key === "Enter" || event.key === " ") {
        toggle();
        return true;
      }
    },
    [disabled, toggle],
  );

  const handlePointerDown = useCallback(() => {
    toggle();
  }, [toggle]);

  const handleFocus = useCallback(() => {
    setFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setFocused(false);
  }, []);

  const track = checked ? "\u25CF\u2501\u2501" : "\u2501\u2501\u25CB";
  const prefix = focused ? "\u25B8 " : "";

  const textColor = disabled
    ? theme.colors.textDim
    : focused
      ? theme.colors.primary
      : theme.colors.text;

  return (
    <Box
      flexDirection="row"
      focusable={!disabled}
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <Text color={textColor} italic={disabled}>
        {prefix}{track}
        {label ? ` ${label}` : ""}
      </Text>
    </Box>
  );
}

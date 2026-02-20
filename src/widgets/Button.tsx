import React, { useCallback, useState } from "react";

import { Box, Text } from "../react/primitives.tsx";
import { useTheme } from "../react/theme.tsx";
import type { KeyEvent } from "../core/events.ts";

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger";
}

export function Button({
  label,
  onPress,
  disabled = false,
  variant = "default",
}: ButtonProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const variantColor =
    variant === "primary"
      ? theme.colors.primary
      : variant === "danger"
        ? theme.colors.error
        : theme.colors.text;

  const textColor = disabled
    ? theme.colors.textDim
    : focused
      ? theme.colors.primary
      : variantColor;

  const borderColor = disabled
    ? theme.colors.textDim
    : focused
      ? theme.colors.focusBorder
      : theme.colors.border;

  const borderStyle = focused
    ? theme.borders.focused
    : theme.borders.default;

  const handleKeyDown = useCallback(
    (event: KeyEvent) => {
      if (disabled) return;
      if (event.key === "Enter") {
        onPress?.();
        return true;
      }
    },
    [disabled, onPress],
  );

  const handlePointerDown = useCallback(() => {
    if (disabled) return;
    setPressed(true);
  }, [disabled]);

  const handlePointerUp = useCallback(() => {
    if (disabled) return;
    setPressed(false);
    onPress?.();
  }, [disabled, onPress]);

  const handleFocus = useCallback(() => {
    setFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setFocused(false);
    setPressed(false);
  }, []);

  return (
    <Box
      border
      borderStyle={borderStyle}
      color={pressed ? undefined : borderColor}
      focusable={!disabled}
      role="button"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <Text
        bold={!disabled}
        italic={disabled}
        color={pressed ? undefined : textColor}
        backgroundColor={pressed ? textColor : undefined}
      >
        {label}
      </Text>
    </Box>
  );
}

import React, { useCallback, useState } from "react";

import { Box, Text } from "../react/primitives.tsx";
import { useTheme } from "../react/theme.tsx";
import type { KeyEvent } from "../core/events.ts";
import { useFocusState, getBorderProps, getTextColor } from "./shared.ts";

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
  const { focused, onFocus, onBlur: focusBlur } = useFocusState();
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

  const { borderStyle, borderColor } = getBorderProps(focused, theme);
  const disabledBorderColor = disabled
    ? theme.colors.textDim
    : borderColor;

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

  const handleBlur = useCallback(() => {
    focusBlur();
    setPressed(false);
  }, [focusBlur]);

  return (
    <Box
      border
      borderStyle={borderStyle}
      color={pressed ? undefined : disabledBorderColor}
      focusable={!disabled}
      role="button"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onFocus={onFocus}
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

import React, { useCallback, useState } from "react";

import { Box, Text } from "../react/primitives.tsx";
import { useTheme } from "../react/theme.tsx";
import type { KeyEvent } from "../core/events.ts";

export interface CheckBoxProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  indeterminate?: boolean;
}

export function CheckBox({
  checked,
  onChange,
  label,
  disabled = false,
  indeterminate = false,
}: CheckBoxProps) {
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

  let indicator: string;
  if (disabled) {
    indicator = "[-]";
  } else if (focused) {
    indicator = "[▸]";
  } else if (indeterminate) {
    indicator = "[~]";
  } else if (checked) {
    indicator = "[x]";
  } else {
    indicator = "[ ]";
  }

  const ariaChecked: boolean | "mixed" = indeterminate
    ? "mixed"
    : checked;

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
      aria-checked={ariaChecked}
      aria-label={label}
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <Text color={textColor} italic={disabled}>
        {indicator}
        {label ? ` ${label}` : ""}
      </Text>
    </Box>
  );
}

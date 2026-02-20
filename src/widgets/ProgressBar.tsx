import React, { type ReactNode } from "react";

import { Box, Text } from "../react/primitives.tsx";
import { useTheme } from "../react/theme.tsx";

export interface ProgressBarProps {
  value: number; // 0 to 1
  width: number;
  children?: ReactNode;
  filledStyle?: { color?: string; backgroundColor?: string };
  emptyStyle?: { color?: string; backgroundColor?: string };
}

export function ProgressBar({
  value,
  width,
  children,
  filledStyle,
  emptyStyle,
}: ProgressBarProps) {
  const theme = useTheme();

  const clamped = Math.max(0, Math.min(1, value));
  const filledCount = Math.round(clamped * width);
  const emptyCount = width - filledCount;

  return (
    <Box
      flexDirection="row"
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <Text
        color={filledStyle?.color ?? theme.colors.filled}
        backgroundColor={filledStyle?.backgroundColor}
      >
        {"\u2588".repeat(filledCount)}
      </Text>
      <Text
        color={emptyStyle?.color ?? theme.colors.empty}
        backgroundColor={emptyStyle?.backgroundColor}
      >
        {"\u2591".repeat(emptyCount)}
      </Text>
      {children}
    </Box>
  );
}

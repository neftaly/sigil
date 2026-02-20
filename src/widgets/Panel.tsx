import React, { type ReactNode } from "react";

import { Box, Text } from "../react/primitives.tsx";
import { useTheme } from "../react/theme.tsx";
import type { BorderStyle } from "../core/borders.ts";

export interface PanelProps {
  title?: string;
  children?: ReactNode;
  width?: number;
  borderStyle?: BorderStyle;
}

export function Panel({
  title,
  children,
  width,
  borderStyle,
}: PanelProps) {
  const theme = useTheme();

  return (
    <Box
      border
      borderStyle={borderStyle ?? theme.borders.default}
      color={theme.colors.border}
      width={width}
      role="group"
    >
      {title && <Text bold color={theme.colors.text}>{title}</Text>}
      {children}
    </Box>
  );
}

import React from "react";

import { Box, Text } from "../react/primitives.tsx";
import { useTheme } from "../react/theme.tsx";

export interface DividerProps {
  direction?: "horizontal" | "vertical";
}

export function Divider({
  direction = "horizontal",
}: DividerProps) {
  const theme = useTheme();

  if (direction === "vertical") {
    return (
      <Box width={1} flexGrow={1} role="separator">
        <Text color={theme.colors.border}>{"\u2502"}</Text>
      </Box>
    );
  }

  return (
    <Box flexGrow={1} role="separator">
      <Text color={theme.colors.border}>{"\u2500".repeat(80)}</Text>
    </Box>
  );
}

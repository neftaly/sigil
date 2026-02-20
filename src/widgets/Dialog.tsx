import React, { type ReactNode, useCallback } from "react";

import { Box, Text } from "../react/primitives.tsx";
import { useTheme } from "../react/theme.tsx";
import { FocusTrap } from "../react/focus-trap.tsx";
import type { KeyEvent } from "../core/events.ts";

export interface DialogProps {
  title?: string;
  children?: ReactNode;
  onClose?: () => void;
  "aria-label"?: string;
}

export function Dialog({
  title,
  children,
  onClose,
  "aria-label": ariaLabel,
}: DialogProps) {
  const theme = useTheme();

  const handleKeyDown = useCallback(
    (event: KeyEvent) => {
      if (event.key === "Escape" && onClose) {
        onClose();
        return true;
      }
    },
    [onClose],
  );

  return (
    <FocusTrap>
      <Box
        position="absolute"
        z={100}
        border
        borderStyle={theme.borders.focused}
        color={theme.colors.focusBorder}
        padding={1}
        role="dialog"
        aria-label={ariaLabel ?? title}
        onKeyDown={handleKeyDown}
      >
        {title && (
          <Text bold color={theme.colors.text}>
            {title}
          </Text>
        )}
        {children}
      </Box>
    </FocusTrap>
  );
}

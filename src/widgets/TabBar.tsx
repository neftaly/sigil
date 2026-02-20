import React, { useCallback, useState } from "react";

import { Box, Text } from "../react/primitives.tsx";
import { useTheme } from "../react/theme.tsx";
import type { KeyEvent } from "../core/events.ts";

export interface TabBarProps {
  value: string;
  onChange?: (value: string) => void;
  tabs: Array<{ value: string; label: string; disabled?: boolean }>;
}

export function TabBar({
  value,
  onChange,
  tabs,
}: TabBarProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const findNextEnabled = useCallback(
    (fromIndex: number, direction: 1 | -1): number => {
      let i = fromIndex + direction;
      while (i >= 0 && i < tabs.length) {
        if (!tabs[i].disabled) return i;
        i += direction;
      }
      return fromIndex;
    },
    [tabs],
  );

  const handleKeyDown = useCallback(
    (event: KeyEvent) => {
      const currentIndex = tabs.findIndex((t) => t.value === value);
      switch (event.key) {
        case "ArrowRight": {
          const next = findNextEnabled(currentIndex, 1);
          if (next !== currentIndex) {
            onChange?.(tabs[next].value);
          }
          return true;
        }
        case "ArrowLeft": {
          const prev = findNextEnabled(currentIndex, -1);
          if (prev !== currentIndex) {
            onChange?.(tabs[prev].value);
          }
          return true;
        }
      }
    },
    [tabs, value, onChange, findNextEnabled],
  );

  const handleFocus = useCallback(() => {
    setFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setFocused(false);
  }, []);

  return (
    <Box
      focusable
      role="tablist"
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      flexDirection="row"
    >
      {tabs.map((tab) => {
        const isActive = tab.value === value;
        const isDisabled = tab.disabled === true;

        const tabColor = isDisabled
          ? theme.colors.textDim
          : isActive
            ? theme.colors.primary
            : focused
              ? theme.colors.text
              : theme.colors.textDim;

        const leftBracket = isActive ? "\u250C" : "\u2502";
        const rightBracket = isActive ? "\u2510" : "\u2502";

        return (
          <Box key={tab.value} flexDirection="row">
            <Text color={tabColor}>
              {leftBracket}
            </Text>
            <Text
              color={tabColor}
              bold={isActive}
              italic={isDisabled}
            >
              {" "}{tab.label}{" "}
            </Text>
            <Text color={tabColor}>
              {rightBracket}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

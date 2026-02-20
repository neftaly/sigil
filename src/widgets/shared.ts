import { useCallback, useState } from "react";

import type { Theme } from "../react/theme.tsx";
import type { BorderStyle } from "../core/borders.ts";

/**
 * Hook that manages focus state for a widget.
 * Returns { focused, onFocus, onBlur } handlers.
 */
export function useFocusState(): {
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
} {
  const [focused, setFocused] = useState(false);
  const onFocus = useCallback(() => setFocused(true), []);
  const onBlur = useCallback(() => setFocused(false), []);
  return { focused, onFocus, onBlur };
}

/**
 * Returns border style and color props based on focus state.
 */
export function getBorderProps(
  focused: boolean,
  theme: Theme,
): { borderStyle: BorderStyle; borderColor: string } {
  const borderStyle = focused ? theme.borders.focused : theme.borders.default;
  const borderColor = focused ? theme.colors.focusBorder : theme.colors.border;
  return { borderStyle, borderColor };
}

/**
 * Returns the appropriate text color based on disabled/focused state.
 * Pattern: disabled ? textDim : focused ? primary : text
 */
export function getTextColor(
  opts: { disabled?: boolean; focused?: boolean },
  theme: Theme,
): string {
  if (opts.disabled) return theme.colors.textDim;
  if (opts.focused) return theme.colors.primary;
  return theme.colors.text;
}

/**
 * Hook for managing a scroll window over a list of items.
 * Returns the current scroll offset and a function to ensure
 * a given index is visible within the window.
 */
export function useScrollWindow(
  visibleHeight: number,
): {
  scrollOffset: number;
  ensureVisible: (index: number) => void;
} {
  const [scrollOffset, setScrollOffset] = useState(0);

  const ensureVisible = useCallback(
    (index: number) => {
      setScrollOffset((offset) => {
        if (index < offset) return index;
        if (index >= offset + visibleHeight) return index - visibleHeight + 1;
        return offset;
      });
    },
    [visibleHeight],
  );

  return { scrollOffset, ensureVisible };
}

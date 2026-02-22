import React, { useCallback, useEffect, useRef, useState } from "react";

import type { Theme } from "../react/theme.tsx";
import type { BorderStyle } from "../core/borders.ts";
import type { LayoutNode } from "../core/database.ts";
import { setPointerCapture, clearPointerCapture } from "../core/events.ts";
import { CanvasContext } from "../react/canvas-context.ts";

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
 * Returns border style and color props based on focus and hover state.
 */
export function getBorderPropsWithHover(
  focused: boolean,
  hovered: boolean,
  theme: Theme,
): { borderStyle: BorderStyle; borderColor: string } {
  if (focused) return { borderStyle: theme.borders.focused, borderColor: theme.colors.focusBorder };
  if (hovered) return { borderStyle: theme.borders.default, borderColor: theme.colors.hoverBorder };
  return { borderStyle: theme.borders.default, borderColor: theme.colors.border };
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
  scrollBy: (delta: number, maxOffset: number) => void;
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

  const scrollBy = useCallback(
    (delta: number, maxOffset: number) => {
      setScrollOffset((offset) => Math.max(0, Math.min(maxOffset, offset + delta)));
    },
    [],
  );

  return { scrollOffset, ensureVisible, scrollBy };
}

// --- Scroll view computation ---

export interface ScrollView {
  hasMoreAbove: boolean;
  hasMoreBelow: boolean;
  visibleCount: number;
}

/**
 * Pure function that computes scroll indicator visibility and the number
 * of visible items given the current scroll offset, viewport height
 * (inner area excluding borders), and total item count.
 */
export function computeScrollView(
  scrollOffset: number,
  viewportHeight: number,
  totalItems: number,
): ScrollView {
  const hasMoreAbove = scrollOffset > 0;
  const upRows = hasMoreAbove ? 1 : 0;
  const tentativeHasMoreBelow =
    scrollOffset + (viewportHeight - upRows) < totalItems;
  const indicatorRows = (hasMoreAbove ? 1 : 0) + (tentativeHasMoreBelow ? 1 : 0);
  const visibleCount = Math.max(1, viewportHeight - indicatorRows);
  const hasMoreBelow = scrollOffset + visibleCount < totalItems;
  return { hasMoreAbove, hasMoreBelow, visibleCount };
}

// --- Focus index management ---

/**
 * Hook that manages a focus index with a synchronized ref.
 * Automatically clamps when optionsLength shrinks.
 */
export function useFocusIndex(
  optionsLength: number,
  initialIndex?: number,
): {
  focusIndex: number;
  focusIndexRef: React.MutableRefObject<number>;
  setFocus: (index: number) => void;
} {
  const [focusIndex, setFocusIndex] = useState(initialIndex ?? 0);
  const focusIndexRef = useRef(focusIndex);

  const setFocus = useCallback((index: number) => {
    focusIndexRef.current = index;
    setFocusIndex(index);
  }, []);

  // Clamp when options shrink
  useEffect(() => {
    if (optionsLength === 0) return;
    const maxIdx = optionsLength - 1;
    if (focusIndexRef.current > maxIdx) {
      focusIndexRef.current = maxIdx;
      setFocusIndex(maxIdx);
    }
  }, [optionsLength]);

  return { focusIndex, focusIndexRef, setFocus };
}

// --- List navigation ---

/**
 * Pure function that computes the new focus index for list navigation keys.
 * Returns undefined if the key is not a navigation key.
 */
export function navigateList(
  key: string,
  currentIndex: number,
  itemCount: number,
  pageSize: number,
): number | undefined {
  switch (key) {
    case "ArrowUp":
      return Math.max(0, currentIndex - 1);
    case "ArrowDown":
      return Math.min(itemCount - 1, currentIndex + 1);
    case "Home":
      return 0;
    case "End":
      return itemCount - 1;
    case "PageUp":
      return Math.max(0, currentIndex - pageSize);
    case "PageDown":
      return Math.min(itemCount - 1, currentIndex + pageSize);
    default:
      return undefined;
  }
}

// --- Drag capture ---

/**
 * Hook that manages pointer capture for drag interactions.
 */
export function useDragCapture(): {
  targetRef: React.MutableRefObject<LayoutNode | null>;
  isDragging: React.MutableRefObject<boolean>;
  startDrag: () => void;
  stopDrag: () => void;
} {
  const targetRef = useRef<LayoutNode | null>(null);
  const isDragging = useRef(false);
  // useContext (not useCanvasContext) to avoid throwing when no provider (tests)
  const canvasCtx = React.useContext(CanvasContext);
  const eventState = canvasCtx?.eventState ?? null;

  const startDrag = useCallback(() => {
    isDragging.current = true;
    const id = targetRef.current?.id;
    if (id && eventState) {
      setPointerCapture(eventState, id);
    }
  }, [eventState]);

  const stopDrag = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (eventState) {
      clearPointerCapture(eventState);
    }
  }, [eventState]);

  return { targetRef, isDragging, startDrag, stopDrag };
}

// --- Numeric helpers ---

/** Clamp a value to [min, max]. */
export function clampValue(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Snap a value to the nearest step, relative to a base value. */
export function snapToStep(v: number, step: number, base: number): number {
  if (step === 0) return v;
  if (!Number.isFinite(base)) {
    return Math.round(v / step) * step;
  }
  return Math.round((v - base) / step) * step + base;
}

import { type ReactNode, createElement, useEffect, useRef } from "react";

import {
  type KeyEvent,
  type LayoutNode,
  type PointerEvent,
  SELECTION_OVERLAY_PREFIX,
  type TextUpdateEvent,
  releasePointerCapture,
  removeOverlay,
  setOverlay,
  setPointerCapture,
} from "@charui/core";
import { useCanvasContext } from "@charui/react";

export interface InputAction {
  type: "moveLeft" | "moveRight" | "home" | "end";
  extend?: boolean;
}

export interface InputChangeEvent {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  scrollOffset: number;
}

export interface InputProps {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  scrollOffset?: number;
  showCursor?: boolean;
  width: number;
  placeholder?: string;
  onChange?: (event: InputChangeEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * Map a key event to a navigation action.
 * Text insertion/deletion is handled by EditContext, not keydown.
 */
function keyToAction(event: KeyEvent): InputAction | null {
  const extend = event.shiftKey;
  switch (event.key) {
    case "ArrowLeft":
      return { type: "moveLeft", extend };
    case "ArrowRight":
      return { type: "moveRight", extend };
    case "Home":
      return { type: "home", extend };
    case "End":
      return { type: "end", extend };
    default:
      return null;
  }
}

/**
 * Apply a navigation action to the input state.
 */
export function applyAction(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  scrollOffset: number,
  width: number,
  action: InputAction,
): InputChangeEvent {
  const collapsed = selectionStart === selectionEnd;
  let newStart = selectionStart;
  let newEnd = selectionEnd;

  if (action.extend) {
    // Extend selection (move selectionEnd, keep selectionStart)
    switch (action.type) {
      case "moveLeft":
        newEnd = Math.max(0, selectionEnd - 1);
        break;
      case "moveRight":
        newEnd = Math.min(value.length, selectionEnd + 1);
        break;
      case "home":
        newEnd = 0;
        break;
      case "end":
        newEnd = value.length;
        break;
    }
  } else {
    // Collapse selection and move cursor
    let cursor: number;
    if (collapsed) {
      cursor = selectionEnd;
    } else if (action.type === "moveLeft" || action.type === "home") {
      cursor = Math.min(selectionStart, selectionEnd);
    } else {
      cursor = Math.max(selectionStart, selectionEnd);
    }

    switch (action.type) {
      case "moveLeft":
        newEnd = Math.max(0, cursor - (collapsed ? 1 : 0));
        newStart = newEnd;
        break;
      case "moveRight":
        newEnd = Math.min(
          value.length,
          cursor + (collapsed ? 1 : 0),
        );
        newStart = newEnd;
        break;
      case "home":
        newEnd = 0;
        newStart = newEnd;
        break;
      case "end":
        newEnd = value.length;
        newStart = newEnd;
        break;
    }
  }

  // Adjust scroll to keep the active end (newEnd) visible
  let newScroll = scrollOffset;
  if (newEnd < newScroll) {
    newScroll = newEnd;
  }
  if (newEnd >= newScroll + width) {
    newScroll = newEnd - width + 1;
  }

  return {
    value,
    selectionStart: newStart,
    selectionEnd: newEnd,
    scrollOffset: newScroll,
  };
}

/**
 * Adjust scroll offset to keep a position visible.
 */
function adjustScroll(
  position: number,
  scrollOffset: number,
  width: number,
): number {
  let newScroll = scrollOffset;
  if (position < newScroll) {
    newScroll = position;
  }
  if (position >= newScroll + width) {
    newScroll = position - width + 1;
  }
  return newScroll;
}

/**
 * Stateless controlled input component.
 * Text insertion/deletion via EditContext (onTextUpdate).
 * Navigation via keyboard events (onKeyDown).
 * Cursor and selection rendered via overlay system.
 */
export function Input({
  value,
  selectionStart,
  selectionEnd,
  scrollOffset = 0,
  showCursor = false,
  width,
  placeholder,
  onChange,
  onFocus,
  onBlur,
}: InputProps): ReactNode {
  const { eventState, overlayState, editContextSync } = useCanvasContext();
  const nodeRef = useRef<LayoutNode>(null);
  const draggingRef = useRef(false);

  // Track latest state in a ref so textupdate handlers always see current values
  // (EditContext fires events faster than React re-renders)
  const stateRef = useRef({
    value,
    selectionStart,
    selectionEnd,
    scrollOffset,
  });
  stateRef.current = { value, selectionStart, selectionEnd, scrollOffset };

  const displayText = value.length > 0 ? value : (placeholder ?? "");
  const isPlaceholder = value.length === 0 && placeholder;
  const visibleSlice = displayText.slice(scrollOffset, scrollOffset + width);
  const content = visibleSlice.padEnd(width, " ");

  // Manage cursor/selection overlay
  useEffect(() => {
    const node = nodeRef.current;
    if (!showCursor || !node?.bounds) {
      if (node) {
        removeOverlay(overlayState, `${SELECTION_OVERLAY_PREFIX}${node.id}`);
      }
      return;
    }

    const { x, y } = node.bounds;
    const lower = Math.min(selectionStart, selectionEnd);
    const upper = Math.max(selectionStart, selectionEnd);

    // Convert char indices to visible grid cols (accounting for scroll)
    const visibleLower = lower - scrollOffset;
    const visibleUpper =
      selectionStart === selectionEnd
        ? lower - scrollOffset + 1
        : upper - scrollOffset;

    // Clamp to visible range
    const clampedLower = Math.max(0, visibleLower);
    const clampedUpper = Math.min(width - 1, visibleUpper - 1);

    if (clampedLower > clampedUpper) {
      removeOverlay(overlayState, `${SELECTION_OVERLAY_PREFIX}${node.id}`);
      return;
    }

    setOverlay(overlayState, {
      id: `${SELECTION_OVERLAY_PREFIX}${node.id}`,
      priority: 100,
      ranges: [
        {
          startRow: y,
          startCol: x + clampedLower,
          endRow: y,
          endCol: x + clampedUpper,
        },
      ],
      transform: { type: "invert" },
    });

    return () => {
      removeOverlay(overlayState, `${SELECTION_OVERLAY_PREFIX}${node.id}`);
    };
  }, [
    showCursor,
    selectionStart,
    selectionEnd,
    scrollOffset,
    width,
    overlayState,
  ]);

  const updateAndSync = (result: InputChangeEvent) => {
    stateRef.current = result;
    onChange?.(result);
    editContextSync?.sync(
      result.value,
      result.selectionStart,
      result.selectionEnd,
    );
  };

  const handleTextUpdate = (event: TextUpdateEvent) => {
    if (!onChange) {
      return;
    }
    const s = stateRef.current;
    const newValue =
      s.value.slice(0, event.updateRangeStart) +
      event.text +
      s.value.slice(event.updateRangeEnd);
    const newScroll = adjustScroll(event.selectionStart, s.scrollOffset, width);
    updateAndSync({
      value: newValue,
      selectionStart: event.selectionStart,
      selectionEnd: event.selectionEnd,
      scrollOffset: newScroll,
    });
  };

  const handleKeyDown = (event: KeyEvent) => {
    if (!onChange) {
      return;
    }
    const action = keyToAction(event);
    if (action) {
      const s = stateRef.current;
      updateAndSync(
        applyAction(
          s.value,
          s.selectionStart,
          s.selectionEnd,
          s.scrollOffset,
          width,
          action,
        ),
      );
    }
  };

  const pointerToCharPos = (event: PointerEvent): number | null => {
    if (!event.targetBounds) {
      return null;
    }
    const s = stateRef.current;
    const relativeColumn = event.col - event.targetBounds.x;
    return Math.min(
      s.value.length,
      Math.max(0, s.scrollOffset + relativeColumn),
    );
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (!onChange) {
      return;
    }
    const clickPos = pointerToCharPos(event);
    if (clickPos === null) {
      return;
    }
    const s = stateRef.current;

    let newStart: number;
    let newEnd: number;
    if (event.shiftKey) {
      // Extend selection to click position
      newStart = s.selectionStart;
      newEnd = clickPos;
    } else {
      // Collapse to click position (anchor for potential drag)
      newStart = clickPos;
      newEnd = clickPos;
    }

    updateAndSync({
      value: s.value,
      selectionStart: newStart,
      selectionEnd: newEnd,
      scrollOffset: s.scrollOffset,
    });

    // Start drag-select
    draggingRef.current = true;
    const node = nodeRef.current;
    if (node) {
      setPointerCapture(eventState, node.id);
    }
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!draggingRef.current || !onChange) {
      return;
    }
    const movePos = pointerToCharPos(event);
    if (movePos === null) {
      return;
    }
    const s = stateRef.current;

    // SelectionStart is the anchor, selectionEnd follows the pointer
    updateAndSync({
      value: s.value,
      selectionStart: s.selectionStart,
      selectionEnd: movePos,
      scrollOffset: s.scrollOffset,
    });
  };

  const handlePointerUp = () => {
    if (!draggingRef.current) {
      return;
    }
    draggingRef.current = false;
    releasePointerCapture(eventState);
  };

  return createElement("text", {
    ref: nodeRef,
    content,
    onTextUpdate: handleTextUpdate,
    onKeyDown: handleKeyDown,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onFocus: onFocus ? () => onFocus() : undefined,
    onBlur: onBlur ? () => onBlur() : undefined,
    focusable: true,
    cursor: "text",
    color: isPlaceholder ? "#666" : undefined,
  });
}

import { type ReactNode, createElement } from "react";

import type { KeyEvent, PointerEvent } from "@charui/core";

export interface InputAction {
  type:
    | "insert"
    | "delete"
    | "backspace"
    | "moveLeft"
    | "moveRight"
    | "home"
    | "end";
  char?: string;
}

export interface InputChangeEvent {
  value: string;
  cursorPosition: number;
  scrollOffset: number;
}

export interface InputProps {
  value: string;
  cursorPosition: number;
  scrollOffset?: number;
  showCursor?: boolean;
  width: number;
  placeholder?: string;
  onChange?: (event: InputChangeEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * Map a key event to an input action.
 */
function keyToAction(event: KeyEvent): InputAction | null {
  if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
    return { type: "insert", char: event.key };
  }

  switch (event.key) {
    case "Backspace": {
      return { type: "backspace" };
    }
    case "Delete": {
      return { type: "delete" };
    }
    case "ArrowLeft": {
      return { type: "moveLeft" };
    }
    case "ArrowRight": {
      return { type: "moveRight" };
    }
    case "Home": {
      return { type: "home" };
    }
    case "End": {
      return { type: "end" };
    }
    default: {
      return null;
    }
  }
}

/**
 * Apply an action to the input state and return the new state.
 */
export function applyAction(
  value: string,
  cursorPosition: number,
  scrollOffset: number,
  width: number,
  action: InputAction,
): InputChangeEvent {
  let newValue = value;
  let newCursor = cursorPosition;
  let newScroll = scrollOffset;

  switch (action.type) {
    case "insert": {
      if (action.char) {
        newValue =
          value.slice(0, cursorPosition) +
          action.char +
          value.slice(cursorPosition);
        newCursor = cursorPosition + 1;
      }
      break;
    }
    case "backspace": {
      if (cursorPosition > 0) {
        newValue =
          value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
        newCursor = cursorPosition - 1;
      }
      break;
    }
    case "delete": {
      if (cursorPosition < value.length) {
        newValue =
          value.slice(0, cursorPosition) + value.slice(cursorPosition + 1);
      }
      break;
    }
    case "moveLeft": {
      if (cursorPosition > 0) {
        newCursor = cursorPosition - 1;
      }
      break;
    }
    case "moveRight": {
      if (cursorPosition < value.length) {
        newCursor = cursorPosition + 1;
      }
      break;
    }
    case "home": {
      newCursor = 0;
      break;
    }
    case "end": {
      newCursor = newValue.length;
      break;
    }
  }

  // Adjust scroll to keep cursor visible
  if (newCursor < newScroll) {
    newScroll = newCursor;
  }
  if (newCursor >= newScroll + width) {
    newScroll = newCursor - width + 1;
  }

  return {
    value: newValue,
    cursorPosition: newCursor,
    scrollOffset: newScroll,
  };
}

/**
 * Stateless controlled input component.
 * Renders the visible portion of text and a cursor block when focused.
 */
export function Input({
  value,
  cursorPosition,
  scrollOffset = 0,
  showCursor = false,
  width,
  placeholder,
  onChange,
  onFocus,
  onBlur,
}: InputProps): ReactNode {
  const displayText = value.length > 0 ? value : (placeholder ?? "");
  const isPlaceholder = value.length === 0 && placeholder;
  const visibleSlice = displayText.slice(scrollOffset, scrollOffset + width);
  const padded = visibleSlice.padEnd(width, " ");

  // Build content: replace cursor position char with block cursor when visible
  let content = padded;
  if (showCursor) {
    const cursorCol = cursorPosition - scrollOffset;
    if (cursorCol >= 0 && cursorCol < width) {
      content = `${padded.slice(0, cursorCol)}\u2588${padded.slice(cursorCol + 1)}`;
    }
  }

  const handleKeyDown = (event: KeyEvent) => {
    if (!onChange) {
      return;
    }
    const action = keyToAction(event);
    if (action) {
      const result = applyAction(
        value,
        cursorPosition,
        scrollOffset,
        width,
        action,
      );
      onChange(result);
    }
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (!onChange || !event.targetBounds) {
      return;
    }
    const relCol = event.col - event.targetBounds.x;
    const newCursor = Math.min(value.length, scrollOffset + relCol);
    onChange({ value, cursorPosition: newCursor, scrollOffset });
  };

  return createElement("text", {
    content,
    onKeyDown: handleKeyDown,
    onPointerDown: handlePointerDown,
    onFocus: onFocus ? () => onFocus() : undefined,
    onBlur: onBlur ? () => onBlur() : undefined,
    focusable: true,
    cursor: "text",
    color: isPlaceholder ? "#666" : undefined,
  });
}

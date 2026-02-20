// --- Selection Reducer ---

export interface SelectionState {
  index: number;
}

export type SelectionAction =
  | { type: "moveUp" }
  | { type: "moveDown" }
  | { type: "moveToStart" }
  | { type: "moveToEnd" }
  | { type: "moveTo"; index: number };

export function selectionReducer(
  state: SelectionState,
  action: SelectionAction,
  count: number,
): SelectionState {
  if (count <= 0) {
    return { index: 0 };
  }

  switch (action.type) {
    case "moveUp":
      return { index: Math.max(0, state.index - 1) };
    case "moveDown":
      return { index: Math.min(count - 1, state.index + 1) };
    case "moveToStart":
      return { index: 0 };
    case "moveToEnd":
      return { index: count - 1 };
    case "moveTo":
      return { index: Math.max(0, Math.min(count - 1, action.index)) };
  }
}

// --- Range Reducer ---

export interface RangeState {
  value: number;
}

export interface RangeConfig {
  min: number;
  max: number;
  step: number;
}

export type RangeAction =
  | { type: "increment" }
  | { type: "decrement" }
  | { type: "setToMin" }
  | { type: "setToMax" }
  | { type: "setTo"; value: number };

function clampRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function rangeReducer(
  state: RangeState,
  action: RangeAction,
  config: RangeConfig,
): RangeState {
  const { min, max, step } = config;

  switch (action.type) {
    case "increment":
      return { value: clampRange(state.value + step, min, max) };
    case "decrement":
      return { value: clampRange(state.value - step, min, max) };
    case "setToMin":
      return { value: min };
    case "setToMax":
      return { value: max };
    case "setTo":
      return { value: clampRange(action.value, min, max) };
  }
}

// --- Text Input Reducer ---

export interface TextInputState {
  value: string;
  cursor: number;
  selectionStart: number | null;
  selectionEnd: number | null;
}

export type TextInputAction =
  | { type: "insert"; text: string }
  | { type: "delete" }
  | { type: "backspace" }
  | { type: "moveCursorLeft"; shift?: boolean }
  | { type: "moveCursorRight"; shift?: boolean }
  | { type: "moveCursorToStart"; shift?: boolean }
  | { type: "moveCursorToEnd"; shift?: boolean }
  | { type: "selectAll" }
  | { type: "setValue"; value: string; cursor?: number };

function hasSelection(state: TextInputState): boolean {
  return (
    state.selectionStart !== null &&
    state.selectionEnd !== null &&
    state.selectionStart !== state.selectionEnd
  );
}

function deleteSelection(state: TextInputState): TextInputState {
  const start = state.selectionStart!;
  const end = state.selectionEnd!;
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  return {
    value: state.value.slice(0, lo) + state.value.slice(hi),
    cursor: lo,
    selectionStart: null,
    selectionEnd: null,
  };
}

function updateSelection(
  state: TextInputState,
  newCursor: number,
  shift: boolean,
): TextInputState {
  if (!shift) {
    return {
      ...state,
      cursor: newCursor,
      selectionStart: null,
      selectionEnd: null,
    };
  }

  // Extending selection: anchor stays, cursor end moves
  const anchor =
    state.selectionStart !== null ? state.selectionStart : state.cursor;
  return {
    ...state,
    cursor: newCursor,
    selectionStart: anchor,
    selectionEnd: newCursor,
  };
}

export function textInputReducer(
  state: TextInputState,
  action: TextInputAction,
): TextInputState {
  switch (action.type) {
    case "insert": {
      if (hasSelection(state)) {
        const cleared = deleteSelection(state);
        const newValue =
          cleared.value.slice(0, cleared.cursor) +
          action.text +
          cleared.value.slice(cleared.cursor);
        return {
          value: newValue,
          cursor: cleared.cursor + action.text.length,
          selectionStart: null,
          selectionEnd: null,
        };
      }
      const newValue =
        state.value.slice(0, state.cursor) +
        action.text +
        state.value.slice(state.cursor);
      return {
        value: newValue,
        cursor: state.cursor + action.text.length,
        selectionStart: null,
        selectionEnd: null,
      };
    }

    case "delete": {
      if (hasSelection(state)) {
        return deleteSelection(state);
      }
      if (state.cursor >= state.value.length) {
        return state;
      }
      return {
        value:
          state.value.slice(0, state.cursor) +
          state.value.slice(state.cursor + 1),
        cursor: state.cursor,
        selectionStart: null,
        selectionEnd: null,
      };
    }

    case "backspace": {
      if (hasSelection(state)) {
        return deleteSelection(state);
      }
      if (state.cursor <= 0) {
        return state;
      }
      return {
        value:
          state.value.slice(0, state.cursor - 1) +
          state.value.slice(state.cursor),
        cursor: state.cursor - 1,
        selectionStart: null,
        selectionEnd: null,
      };
    }

    case "moveCursorLeft": {
      const shift = action.shift ?? false;
      if (!shift && hasSelection(state)) {
        // Collapse selection to the left edge
        const lo = Math.min(state.selectionStart!, state.selectionEnd!);
        return {
          ...state,
          cursor: lo,
          selectionStart: null,
          selectionEnd: null,
        };
      }
      const newCursor = Math.max(0, state.cursor - 1);
      return updateSelection(state, newCursor, shift);
    }

    case "moveCursorRight": {
      const shift = action.shift ?? false;
      if (!shift && hasSelection(state)) {
        // Collapse selection to the right edge
        const hi = Math.max(state.selectionStart!, state.selectionEnd!);
        return {
          ...state,
          cursor: hi,
          selectionStart: null,
          selectionEnd: null,
        };
      }
      const newCursor = Math.min(state.value.length, state.cursor + 1);
      return updateSelection(state, newCursor, shift);
    }

    case "moveCursorToStart": {
      const shift = action.shift ?? false;
      return updateSelection(state, 0, shift);
    }

    case "moveCursorToEnd": {
      const shift = action.shift ?? false;
      return updateSelection(state, state.value.length, shift);
    }

    case "selectAll":
      return {
        ...state,
        selectionStart: 0,
        selectionEnd: state.value.length,
        cursor: state.value.length,
      };

    case "setValue": {
      const newValue = action.value;
      const newCursor =
        action.cursor !== undefined
          ? Math.max(0, Math.min(newValue.length, action.cursor))
          : newValue.length;
      return {
        value: newValue,
        cursor: newCursor,
        selectionStart: null,
        selectionEnd: null,
      };
    }
  }
}

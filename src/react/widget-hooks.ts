import { useCallback, useMemo, useReducer, useRef, useState } from "react";

import {
  type Keymap,
  type KeymapOverrides,
  type RangeAction,
  type RangeConfig,
  type RangeState,
  type SelectionAction,
  type SelectionState,
  type TextInputAction,
  type TextInputState,
  matchAction,
  rangeReducer,
  selectionReducer,
  textInputReducer,
} from "../core/index.ts";

/**
 * Wraps selectionReducer with useReducer.
 * The count is captured in a ref so the reducer always uses the latest value.
 */
export function useSelection(
  count: number,
): [SelectionState, (action: SelectionAction) => void] {
  const countRef = useRef(count);
  countRef.current = count;

  const reducerRef = useRef(
    (state: SelectionState, action: SelectionAction) =>
      selectionReducer(state, action, countRef.current),
  );

  const [state, dispatch] = useReducer(reducerRef.current, { index: 0 });
  return [state, dispatch];
}

/**
 * Wraps rangeReducer with useReducer.
 * The config is captured in a ref so the reducer always uses the latest value.
 * Initial value is config.min.
 */
export function useRange(
  config: RangeConfig,
): [RangeState, (action: RangeAction) => void] {
  const configRef = useRef(config);
  configRef.current = config;

  const reducerRef = useRef(
    (state: RangeState, action: RangeAction) =>
      rangeReducer(state, action, configRef.current),
  );

  const [state, dispatch] = useReducer(reducerRef.current, {
    value: config.min,
  });
  return [state, dispatch];
}

/**
 * Wraps textInputReducer with useReducer.
 */
export function useTextInput(
  initialValue?: string,
): [TextInputState, (action: TextInputAction) => void] {
  const [state, dispatch] = useReducer(textInputReducer, {
    value: initialValue ?? "",
    cursor: 0,
    selectionStart: null,
    selectionEnd: null,
  });
  return [state, dispatch];
}

/**
 * Utility hook that returns cursor position info for rendering.
 * Pure computation — no internal state.
 */
export function useTextCursor(state: TextInputState): {
  cursorCol: number;
  hasSelection: boolean;
  selectionRange: [number, number] | null;
} {
  return useMemo(() => {
    const hasSelection =
      state.selectionStart !== null &&
      state.selectionEnd !== null &&
      state.selectionStart !== state.selectionEnd;

    const selectionRange: [number, number] | null = hasSelection
      ? [
          Math.min(state.selectionStart!, state.selectionEnd!),
          Math.max(state.selectionStart!, state.selectionEnd!),
        ]
      : null;

    return {
      cursorCol: state.cursor,
      hasSelection,
      selectionRange,
    };
  }, [state.cursor, state.selectionStart, state.selectionEnd]);
}

/**
 * Wraps matchAction. Returns a handler function that maps key events to actions.
 */
export function useKeymap<T extends string>(
  keymap: Keymap<T>,
  overrides?: KeymapOverrides<T>,
): (event: {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
}) => T | null {
  return useCallback(
    (event: {
      key: string;
      ctrlKey?: boolean;
      shiftKey?: boolean;
      altKey?: boolean;
      metaKey?: boolean;
    }) => matchAction(keymap, overrides, event),
    [keymap, overrides],
  );
}

/**
 * Filters a list of items based on a search string.
 * Case-insensitive substring match.
 */
export function useFilter<T>(
  items: T[],
  getLabel?: (item: T) => string,
): { filtered: T[]; query: string; setQuery: (q: string) => void } {
  const [query, setQuery] = useState("");
  const labelFn = getLabel ?? String;

  const filtered = useMemo(() => {
    if (query === "") {
      return items;
    }
    const lowerQuery = query.toLowerCase();
    return items.filter((item) =>
      labelFn(item).toLowerCase().includes(lowerQuery),
    );
  }, [items, query, labelFn]);

  return { filtered, query, setQuery };
}

// --- Keymap types ---

/** A single action with default key bindings. */
export interface KeyBinding {
  keys: string[];
  description: string;
}

/** A keymap is a record of action names to their bindings. */
export type Keymap<T extends string = string> = Record<T, KeyBinding>;

/** User overrides: action name to replacement keys (null to disable). */
export type KeymapOverrides<T extends string = string> = Partial<
  Record<T, string[] | null>
>;

// --- Key parsing ---

interface ParsedKey {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  base: string;
}

function parseKeyString(keyStr: string): ParsedKey {
  const parts = keyStr.split("+");
  const base = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);

  return {
    ctrl: modifiers.includes("Ctrl"),
    shift: modifiers.includes("Shift"),
    alt: modifiers.includes("Alt"),
    meta: modifiers.includes("Meta"),
    base,
  };
}

function keyMatches(
  parsed: ParsedKey,
  event: {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
  },
): boolean {
  return (
    parsed.base === event.key &&
    parsed.ctrl === (event.ctrlKey ?? false) &&
    parsed.shift === (event.shiftKey ?? false) &&
    parsed.alt === (event.altKey ?? false) &&
    parsed.meta === (event.metaKey ?? false)
  );
}

// --- Functions ---

/**
 * Match a key event against a keymap, returning the action name or null.
 * Checks overrides first (if provided), then defaults.
 */
export function matchAction<T extends string>(
  keymap: Keymap<T>,
  overrides: KeymapOverrides<T> | undefined,
  event: {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
  },
): T | null {
  const actions = Object.keys(keymap) as T[];
  for (const action of actions) {
    // Determine effective keys for this action
    let effectiveKeys: string[] | undefined;
    if (overrides && action in overrides) {
      const override = overrides[action];
      if (override === null) {
        // Action explicitly disabled
        continue;
      }
      effectiveKeys = override;
    } else {
      effectiveKeys = keymap[action].keys;
    }

    if (!effectiveKeys) {
      continue;
    }

    for (const keyStr of effectiveKeys) {
      const parsed = parseKeyString(keyStr);
      if (keyMatches(parsed, event)) {
        return action;
      }
    }
  }

  return null;
}

/**
 * List all active bindings with overrides applied.
 * Actions with null overrides are excluded.
 */
export function listBindings<T extends string>(
  keymap: Keymap<T>,
  overrides?: KeymapOverrides<T>,
): Array<{ action: T; keys: string[]; description: string }> {
  const actions = Object.keys(keymap) as T[];
  const result: Array<{ action: T; keys: string[]; description: string }> = [];

  for (const action of actions) {
    let keys: string[];
    if (overrides && action in overrides) {
      const override = overrides[action];
      if (override === null) {
        // Action disabled, exclude from listing
        continue;
      }
      keys = override ?? keymap[action].keys;
    } else {
      keys = keymap[action].keys;
    }

    result.push({
      action,
      keys,
      description: keymap[action].description,
    });
  }

  return result;
}

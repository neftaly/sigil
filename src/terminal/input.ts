import type { KeyEvent, PointerEvent } from "../core/index.ts";
import { parseSGRMouse } from "./mouse.ts";

// --- Public API types ---

export interface TerminalInputOptions {
  /** Called on parsed key event */
  onKey: (event: KeyEvent) => void;
  /** Called on parsed pointer event from SGR mouse */
  onPointer: (event: PointerEvent) => void;
  /** Called on bracketed paste text */
  onPaste: (text: string) => void;
  /** Called on terminal resize (SIGWINCH) */
  onResize: (cols: number, rows: number) => void;
  /** stdin stream (default: process.stdin) */
  stdin?: NodeJS.ReadStream;
}

export interface TerminalInput {
  /** Start listening (enables raw mode, mouse tracking, bracketed paste) */
  start(): void;
  /** Stop listening (restores terminal state) */
  dispose(): void;
}

// --- Parsed event types for the pure parser ---

export type ParsedEvent =
  | { kind: "key"; event: KeyEvent }
  | { kind: "pointer"; event: PointerEvent }
  | { kind: "paste"; text: string };

// --- ANSI escape sequences ---

const ENABLE_MOUSE = "\x1b[?1006h\x1b[?1003h";
const DISABLE_MOUSE = "\x1b[?1003l\x1b[?1006l";
const ENABLE_BRACKETED_PASTE = "\x1b[?2004h";
const DISABLE_BRACKETED_PASTE = "\x1b[?2004l";
const ENTER_ALTERNATE_SCREEN = "\x1b[?1049h";
const EXIT_ALTERNATE_SCREEN = "\x1b[?1049l";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";

// --- VT key sequence map ---

/** Named key sequences: ESC[ prefix already consumed. */
const CSI_KEY_MAP: Record<string, string> = {
  A: "ArrowUp",
  B: "ArrowDown",
  C: "ArrowRight",
  D: "ArrowLeft",
  H: "Home",
  F: "End",
  Z: "Tab", // Shift+Tab (handled specially below)
};

/** Tilde-terminated sequences: ESC[N~ */
const CSI_TILDE_MAP: Record<string, string> = {
  "2": "Insert",
  "3": "Delete",
  "5": "PageUp",
  "6": "PageDown",
};

// --- Modifier decoding ---

/**
 * Decode xterm modifier parameter.
 * modifier - 1 is a bitfield: bit 0 = shift, bit 1 = alt, bit 2 = ctrl.
 */
function decodeModifiers(mod: number): {
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
} {
  const bits = mod - 1;
  return {
    shiftKey: (bits & 1) !== 0,
    altKey: (bits & 2) !== 0,
    ctrlKey: (bits & 4) !== 0,
  };
}

// --- Key code mapping ---

/**
 * Map a key name to a W3C-style `code` value.
 */
function keyToCode(key: string): string {
  switch (key) {
    case "ArrowUp":
      return "ArrowUp";
    case "ArrowDown":
      return "ArrowDown";
    case "ArrowLeft":
      return "ArrowLeft";
    case "ArrowRight":
      return "ArrowRight";
    case "Home":
      return "Home";
    case "End":
      return "End";
    case "Insert":
      return "Insert";
    case "Delete":
      return "Delete";
    case "PageUp":
      return "PageUp";
    case "PageDown":
      return "PageDown";
    case "Tab":
      return "Tab";
    case "Escape":
      return "Escape";
    case "Enter":
      return "Enter";
    case "Backspace":
      return "Backspace";
    default:
      // For single printable characters, use KeyA-KeyZ for letters
      if (key.length === 1) {
        const upper = key.toUpperCase();
        if (upper >= "A" && upper <= "Z") {
          return `Key${upper}`;
        }
        // Digits
        if (key >= "0" && key <= "9") {
          return `Digit${key}`;
        }
        if (key === " ") {
          return "Space";
        }
      }
      return key;
  }
}

function makeKeyEvent(
  key: string,
  mods: {
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
  } = {},
): KeyEvent {
  return {
    type: "keydown",
    key,
    code: keyToCode(key),
    ctrlKey: mods.ctrlKey ?? false,
    shiftKey: mods.shiftKey ?? false,
    altKey: mods.altKey ?? false,
    metaKey: mods.metaKey ?? false,
  };
}

// --- SGR mouse regex (matches complete sequences within a buffer) ---

// eslint-disable-next-line no-control-regex -- ESC is inherent to the SGR protocol
const SGR_MOUSE_RE = /^\x1b\[<(\d+);(\d+);(\d+)[Mm]/;

// --- Bracketed paste markers ---

const PASTE_START = "\x1b[200~";
const PASTE_END = "\x1b[201~";

// --- Pure input parser ---

/**
 * Parse a buffer of terminal input data into a sequence of events.
 *
 * This is a pure function suitable for unit testing -- it has no side effects.
 */
export function parseInput(data: Buffer): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const str = data.toString("utf-8");
  let i = 0;

  while (i < str.length) {
    // --- Bracketed paste ---
    if (str.startsWith(PASTE_START, i)) {
      i += PASTE_START.length;
      const endIdx = str.indexOf(PASTE_END, i);
      if (endIdx !== -1) {
        events.push({ kind: "paste", text: str.slice(i, endIdx) });
        i = endIdx + PASTE_END.length;
      } else {
        // Incomplete paste -- deliver remaining as paste text
        events.push({ kind: "paste", text: str.slice(i) });
        i = str.length;
      }
      continue;
    }

    // --- ESC sequences ---
    if (str[i] === "\x1b") {
      // CSI sequences: ESC[
      if (str[i + 1] === "[") {
        // SGR mouse: ESC[<...
        if (str[i + 2] === "<") {
          const remaining = str.slice(i);
          const mouseMatch = remaining.match(SGR_MOUSE_RE);
          if (mouseMatch) {
            const parsed = parseSGRMouse(
              remaining.slice(0, mouseMatch[0].length),
            );
            if (parsed) {
              events.push({
                kind: "pointer",
                event: {
                  type: parsed.type,
                  col: parsed.col,
                  row: parsed.row,
                  button: parsed.button,
                  shiftKey: false,
                },
              });
            }
            i += mouseMatch[0].length;
            continue;
          }
        }

        // CSI with modifier: ESC[1;modX or ESC[N;mod~
        const csiRemainder = str.slice(i + 2);
        const modMatch = csiRemainder.match(/^(\d+);(\d+)([A-Z~])/);
        if (modMatch) {
          const param1 = modMatch[1];
          const modifier = Number.parseInt(modMatch[2], 10);
          const terminator = modMatch[3];
          const mods = decodeModifiers(modifier);

          let key: string | undefined;
          if (terminator === "~") {
            key = CSI_TILDE_MAP[param1];
          } else if (param1 === "1") {
            key = CSI_KEY_MAP[terminator];
          }

          if (key) {
            events.push({
              kind: "key",
              event: makeKeyEvent(key, mods),
            });
            i += 2 + modMatch[0].length;
            continue;
          }
        }

        // Tilde-terminated: ESC[N~
        const tildeMatch = csiRemainder.match(/^(\d+)~/);
        if (tildeMatch) {
          const key = CSI_TILDE_MAP[tildeMatch[1]];
          if (key) {
            events.push({ kind: "key", event: makeKeyEvent(key) });
            i += 2 + tildeMatch[0].length;
            continue;
          }
        }

        // Simple CSI: ESC[X
        const simpleChar = str[i + 2];
        if (simpleChar && simpleChar in CSI_KEY_MAP) {
          const key = CSI_KEY_MAP[simpleChar];
          // ESC[Z is Shift+Tab
          if (simpleChar === "Z") {
            events.push({
              kind: "key",
              event: makeKeyEvent(key, { shiftKey: true }),
            });
          } else {
            events.push({ kind: "key", event: makeKeyEvent(key) });
          }
          i += 3;
          continue;
        }

        // Unknown CSI -- skip ESC[ and the next character
        i += 3;
        continue;
      }

      // Bare ESC (no [ follows) -- this is the Escape key
      // Only if nothing follows, or the next char is not [
      events.push({ kind: "key", event: makeKeyEvent("Escape") });
      i += 1;
      continue;
    }

    // --- Control characters ---

    // Enter
    if (str[i] === "\r" || str[i] === "\n") {
      events.push({ kind: "key", event: makeKeyEvent("Enter") });
      i += 1;
      continue;
    }

    // Tab
    if (str[i] === "\t") {
      events.push({ kind: "key", event: makeKeyEvent("Tab") });
      i += 1;
      continue;
    }

    // Backspace
    if (str[i] === "\x7f") {
      events.push({ kind: "key", event: makeKeyEvent("Backspace") });
      i += 1;
      continue;
    }

    // Ctrl+a through Ctrl+z (0x01-0x1a)
    const code = str.charCodeAt(i);
    if (code >= 0x01 && code <= 0x1a) {
      const base = String.fromCharCode(code + 96); // 0x01 -> 'a', etc.
      events.push({
        kind: "key",
        event: makeKeyEvent(base, { ctrlKey: true }),
      });
      i += 1;
      continue;
    }

    // --- Printable characters ---
    if (code >= 0x20) {
      events.push({ kind: "key", event: makeKeyEvent(str[i]) });
      i += 1;
      continue;
    }

    // Skip any other unrecognized byte
    i += 1;
  }

  return events;
}

// --- Terminal input controller ---

export function createTerminalInput(
  options: TerminalInputOptions,
): TerminalInput {
  const stdin = options.stdin ?? process.stdin;
  let dataListener: ((data: Buffer) => void) | null = null;
  let resizeListener: (() => void) | null = null;

  function onData(data: Buffer): void {
    const events = parseInput(data);
    for (const parsed of events) {
      switch (parsed.kind) {
        case "key":
          options.onKey(parsed.event);
          break;
        case "pointer":
          options.onPointer(parsed.event);
          break;
        case "paste":
          options.onPaste(parsed.text);
          break;
      }
    }
  }

  function onResize(): void {
    const cols = process.stdout.columns ?? 80;
    const rows = process.stdout.rows ?? 24;
    options.onResize(cols, rows);
  }

  return {
    start(): void {
      // Enable raw mode
      if (stdin.setRawMode) {
        stdin.setRawMode(true);
      }
      stdin.resume();

      // Enable mouse tracking, bracketed paste, alternate screen, hide cursor
      process.stdout.write(
        ENABLE_MOUSE +
          ENABLE_BRACKETED_PASTE +
          ENTER_ALTERNATE_SCREEN +
          HIDE_CURSOR,
      );

      // Listen for data
      dataListener = onData;
      stdin.on("data", dataListener);

      // Listen for resize
      resizeListener = onResize;
      process.on("SIGWINCH", resizeListener);
    },

    dispose(): void {
      // Disable mouse tracking, bracketed paste, show cursor, exit alternate screen
      process.stdout.write(
        DISABLE_MOUSE +
          DISABLE_BRACKETED_PASTE +
          SHOW_CURSOR +
          EXIT_ALTERNATE_SCREEN,
      );

      // Restore terminal
      if (stdin.setRawMode) {
        stdin.setRawMode(false);
      }
      stdin.pause();

      // Remove listeners
      if (dataListener) {
        stdin.removeListener("data", dataListener);
        dataListener = null;
      }
      if (resizeListener) {
        process.removeListener("SIGWINCH", resizeListener);
        resizeListener = null;
      }
    },
  };
}

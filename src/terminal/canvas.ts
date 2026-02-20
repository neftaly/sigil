import type { ReactElement } from "react";

import {
  type EventState,
  createEventState,
  dispatchKeyEvent,
  dispatchPointerEvent,
  focusAndDispatch,
} from "../core/index.ts";

import { type Root, createRoot } from "../react/render.ts";
import { type TerminalInput, createTerminalInput } from "./input.ts";
import { toAnsi } from "./ansi.ts";

export interface TerminalCanvasOptions {
  /** stdout stream (default: process.stdout) */
  stdout?: NodeJS.WriteStream;
  /** stdin stream (default: process.stdin) */
  stdin?: NodeJS.ReadStream;
}

export interface TerminalCanvas {
  /** Render a React element tree */
  render(element: ReactElement): void;
  /** Clean up and exit */
  unmount(): void;
  /** Current width in columns */
  readonly width: number;
  /** Current height in rows */
  readonly height: number;
}

let instanceActive = false;

export function createTerminalCanvas(
  options?: TerminalCanvasOptions,
): TerminalCanvas {
  if (instanceActive) {
    throw new Error(
      "A TerminalCanvas instance is already active. Call unmount() before creating a new one.",
    );
  }
  instanceActive = true;

  const stdout = options?.stdout ?? process.stdout;
  const stdin = options?.stdin ?? process.stdin;

  const cols = stdout.columns ?? 80;
  const rows = stdout.rows ?? 24;

  const root: Root = createRoot(cols, rows);
  const eventState: EventState = createEventState();

  let disposed = false;

  // --- Rendering ---

  function flush(): void {
    if (disposed) return;
    root.flushLayout();
    const grid = root.getGrid();
    const ansi = toAnsi(grid);
    // Move cursor home and overwrite screen in-place
    stdout.write("\x1b[H" + ansi);
  }

  // --- Input handling ---

  const input: TerminalInput = createTerminalInput({
    stdin,
    onKey(event) {
      if (event.key === "c" && event.ctrlKey) {
        unmount();
        process.exit(0);
        return;
      }
      dispatchKeyEvent(root.database, eventState, event);
      flush();
    },
    onPointer(event) {
      if (event.type === "pointerdown") {
        focusAndDispatch(root.database, eventState, event);
      } else {
        dispatchPointerEvent(root.database, eventState, event);
      }
      flush();
    },
    onPaste(_text: string) {
      // Not dispatched in v1 (terminal has no EditContext)
    },
    onResize(newCols: number, newRows: number) {
      root.resize(newCols, newRows);
      flush();
    },
  });

  // --- Cleanup ---

  function unmount(): void {
    if (disposed) return;
    disposed = true;

    input.dispose();
    root.unmount();
    instanceActive = false;

    // Show cursor + exit alternate screen
    stdout.write("\x1b[?25h\x1b[?1049l");

    // Remove crash handlers
    process.removeListener("SIGINT", onCrash);
    process.removeListener("SIGTERM", onCrash);
    process.removeListener("uncaughtException", onCrashError);
    process.removeListener("unhandledRejection", onCrashError);
  }

  // --- Crash handlers ---

  function onCrash(): void {
    unmount();
    process.exit(1);
  }

  function onCrashError(err: unknown): void {
    unmount();
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  }

  process.on("SIGINT", onCrash);
  process.on("SIGTERM", onCrash);
  process.on("uncaughtException", onCrashError);
  process.on("unhandledRejection", onCrashError);

  // --- Start ---

  input.start();

  return {
    render(element: ReactElement): void {
      root.render(element);
      flush();
    },
    unmount,
    get width() {
      return root.width;
    },
    get height() {
      return root.height;
    },
  };
}

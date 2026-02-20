import type { KeyEvent } from "../core/index.ts";

export interface GamepadAdapterOptions {
  /** Called when a mapped key event is generated */
  onKey: (event: KeyEvent) => void;
  /** Gamepad index to listen to (default: 0) */
  gamepadIndex?: number;
  /** Polling interval in ms (default: 16, ~60fps) */
  pollInterval?: number;
}

export interface GamepadAdapter {
  /** Start polling for gamepad input */
  start(): void;
  /** Stop polling */
  dispose(): void;
}

function makeKeyEvent(
  type: "keydown" | "keyup",
  key: string,
  code: string,
  mods?: { shiftKey?: boolean },
): KeyEvent {
  return {
    type,
    key,
    code,
    ctrlKey: false,
    shiftKey: mods?.shiftKey ?? false,
    altKey: false,
    metaKey: false,
  };
}

const BUTTON_MAP: Array<
  [index: number, key: string, code: string, mods?: { shiftKey?: boolean }]
> = [
  [0, "Enter", "Enter"],
  [1, "Escape", "Escape"],
  [4, "Tab", "Tab", { shiftKey: true }],
  [5, "Tab", "Tab"],
  [12, "ArrowUp", "ArrowUp"],
  [13, "ArrowDown", "ArrowDown"],
  [14, "ArrowLeft", "ArrowLeft"],
  [15, "ArrowRight", "ArrowRight"],
];

const AXIS_MAP: Array<
  [axis: number, direction: 1 | -1, key: string, code: string]
> = [
  [0, -1, "ArrowLeft", "ArrowLeft"],
  [0, 1, "ArrowRight", "ArrowRight"],
  [1, -1, "ArrowUp", "ArrowUp"],
  [1, 1, "ArrowDown", "ArrowDown"],
];

const AXIS_THRESHOLD = 0.5;

export function createGamepadAdapter(
  options: GamepadAdapterOptions,
): GamepadAdapter {
  const { onKey, gamepadIndex = 0, pollInterval = 16 } = options;

  let intervalId: ReturnType<typeof setInterval> | null = null;
  const prevButtons = new Map<number, boolean>();
  const prevAxes = new Map<string, boolean>();

  function poll() {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[gamepadIndex];
    if (!gp) return;

    for (const [index, key, code, mods] of BUTTON_MAP) {
      const pressed = gp.buttons[index]?.pressed ?? false;
      const wasPressed = prevButtons.get(index) ?? false;
      if (pressed && !wasPressed) {
        onKey(makeKeyEvent("keydown", key, code, mods));
      } else if (!pressed && wasPressed) {
        onKey(makeKeyEvent("keyup", key, code, mods));
      }
      prevButtons.set(index, pressed);
    }

    for (const [axis, direction, key, code] of AXIS_MAP) {
      const value = gp.axes[axis] ?? 0;
      const active =
        direction === 1 ? value > AXIS_THRESHOLD : value < -AXIS_THRESHOLD;
      const axisKey = `${axis}:${direction}`;
      const wasActive = prevAxes.get(axisKey) ?? false;
      if (active && !wasActive) {
        onKey(makeKeyEvent("keydown", key, code));
      } else if (!active && wasActive) {
        onKey(makeKeyEvent("keyup", key, code));
      }
      prevAxes.set(axisKey, active);
    }
  }

  return {
    start() {
      if (intervalId !== null) return;
      intervalId = setInterval(poll, pollInterval);
    },
    dispose() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  };
}

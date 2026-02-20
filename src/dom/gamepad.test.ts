import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { KeyEvent } from "../core/index.ts";
import { createGamepadAdapter } from "./gamepad.ts";

function makeGamepad(
  buttons: Record<number, boolean>,
  axes: number[] = [0, 0, 0, 0],
): Gamepad {
  const btnArray: GamepadButton[] = [];
  for (let i = 0; i < 16; i++) {
    const pressed = buttons[i] ?? false;
    btnArray.push({ pressed, touched: pressed, value: pressed ? 1 : 0 });
  }
  return {
    axes,
    buttons: btnArray,
    connected: true,
    id: "Test Gamepad",
    index: 0,
    mapping: "standard",
    timestamp: performance.now(),
    hapticActuators: [],
    vibrationActuator: null as unknown as GamepadHapticActuator,
  };
}

describe("createGamepadAdapter", () => {
  let events: KeyEvent[];
  let getGamepadsMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    events = [];
    getGamepadsMock = vi.fn(() => [null, null, null, null]);
    vi.stubGlobal("navigator", { getGamepads: getGamepadsMock });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("fires keydown on button press and keyup on release", () => {
    const adapter = createGamepadAdapter({
      onKey: (e) => events.push(e),
      pollInterval: 16,
    });
    adapter.start();

    // Frame 1: press A button (index 0)
    getGamepadsMock.mockReturnValue([makeGamepad({ 0: true })]);
    vi.advanceTimersByTime(16);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("keydown");
    expect(events[0].key).toBe("Enter");

    // Frame 2: still pressed, no new events
    vi.advanceTimersByTime(16);
    expect(events).toHaveLength(1);

    // Frame 3: release
    getGamepadsMock.mockReturnValue([makeGamepad({})]);
    vi.advanceTimersByTime(16);

    expect(events).toHaveLength(2);
    expect(events[1].type).toBe("keyup");
    expect(events[1].key).toBe("Enter");

    adapter.dispose();
  });

  it("maps buttons to correct keys", () => {
    const adapter = createGamepadAdapter({
      onKey: (e) => events.push(e),
      pollInterval: 16,
    });
    adapter.start();

    const cases: Array<[number, string, boolean?]> = [
      [0, "Enter"],
      [1, "Escape"],
      [4, "Tab", true], // shiftKey
      [5, "Tab"],
      [12, "ArrowUp"],
      [13, "ArrowDown"],
      [14, "ArrowLeft"],
      [15, "ArrowRight"],
    ];

    for (const [btnIndex, expectedKey, expectedShift] of cases) {
      events = [];

      getGamepadsMock.mockReturnValue([makeGamepad({ [btnIndex]: true })]);
      vi.advanceTimersByTime(16);

      expect(events).toHaveLength(1);
      expect(events[0].key).toBe(expectedKey);
      expect(events[0].shiftKey).toBe(expectedShift ?? false);

      // Release
      getGamepadsMock.mockReturnValue([makeGamepad({})]);
      vi.advanceTimersByTime(16);
    }

    adapter.dispose();
  });

  it("fires events for stick axis exceeding threshold", () => {
    const adapter = createGamepadAdapter({
      onKey: (e) => events.push(e),
      pollInterval: 16,
    });
    adapter.start();

    // Push left stick right (axis 0 > 0.5)
    getGamepadsMock.mockReturnValue([makeGamepad({}, [0.8, 0, 0, 0])]);
    vi.advanceTimersByTime(16);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("keydown");
    expect(events[0].key).toBe("ArrowRight");

    // Return to center
    getGamepadsMock.mockReturnValue([makeGamepad({}, [0, 0, 0, 0])]);
    vi.advanceTimersByTime(16);

    expect(events).toHaveLength(2);
    expect(events[1].type).toBe("keyup");
    expect(events[1].key).toBe("ArrowRight");

    adapter.dispose();
  });

  it("does not fire events for axis values within dead zone", () => {
    const adapter = createGamepadAdapter({
      onKey: (e) => events.push(e),
      pollInterval: 16,
    });
    adapter.start();

    // Small stick deflection (within dead zone)
    getGamepadsMock.mockReturnValue([makeGamepad({}, [0.3, -0.4, 0, 0])]);
    vi.advanceTimersByTime(16);

    expect(events).toHaveLength(0);

    adapter.dispose();
  });

  it("fires events for stick axis at exactly the threshold boundary", () => {
    const adapter = createGamepadAdapter({
      onKey: (e) => events.push(e),
      pollInterval: 16,
    });
    adapter.start();

    // Exactly 0.5 should not trigger (threshold is > 0.5, not >=)
    getGamepadsMock.mockReturnValue([makeGamepad({}, [0.5, 0, 0, 0])]);
    vi.advanceTimersByTime(16);
    expect(events).toHaveLength(0);

    // Just above 0.5 triggers
    getGamepadsMock.mockReturnValue([makeGamepad({}, [0.51, 0, 0, 0])]);
    vi.advanceTimersByTime(16);
    expect(events).toHaveLength(1);
    expect(events[0].key).toBe("ArrowRight");

    adapter.dispose();
  });

  it("does nothing when no gamepad is connected", () => {
    const adapter = createGamepadAdapter({
      onKey: (e) => events.push(e),
      pollInterval: 16,
    });
    adapter.start();

    getGamepadsMock.mockReturnValue([null]);
    vi.advanceTimersByTime(16);

    expect(events).toHaveLength(0);

    adapter.dispose();
  });

  it("respects gamepadIndex option", () => {
    const adapter = createGamepadAdapter({
      onKey: (e) => events.push(e),
      gamepadIndex: 1,
      pollInterval: 16,
    });
    adapter.start();

    // Gamepad at index 0 has button pressed, but we listen to index 1
    getGamepadsMock.mockReturnValue([makeGamepad({ 0: true }), null]);
    vi.advanceTimersByTime(16);
    expect(events).toHaveLength(0);

    // Now gamepad at index 1 has button pressed
    getGamepadsMock.mockReturnValue([null, makeGamepad({ 0: true })]);
    vi.advanceTimersByTime(16);
    expect(events).toHaveLength(1);
    expect(events[0].key).toBe("Enter");

    adapter.dispose();
  });

  it("stops polling on dispose", () => {
    const adapter = createGamepadAdapter({
      onKey: (e) => events.push(e),
      pollInterval: 16,
    });
    adapter.start();
    adapter.dispose();

    getGamepadsMock.mockReturnValue([makeGamepad({ 0: true })]);
    vi.advanceTimersByTime(100);

    expect(events).toHaveLength(0);
  });

  it("maps vertical axis correctly", () => {
    const adapter = createGamepadAdapter({
      onKey: (e) => events.push(e),
      pollInterval: 16,
    });
    adapter.start();

    // Push stick up (axis 1 < -0.5)
    getGamepadsMock.mockReturnValue([makeGamepad({}, [0, -0.8, 0, 0])]);
    vi.advanceTimersByTime(16);

    expect(events).toHaveLength(1);
    expect(events[0].key).toBe("ArrowUp");

    // Push stick down (axis 1 > 0.5)
    events = [];
    getGamepadsMock.mockReturnValue([makeGamepad({}, [0, 0.8, 0, 0])]);
    vi.advanceTimersByTime(16);

    // keyup for ArrowUp + keydown for ArrowDown
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("keyup");
    expect(events[0].key).toBe("ArrowUp");
    expect(events[1].type).toBe("keydown");
    expect(events[1].key).toBe("ArrowDown");

    adapter.dispose();
  });
});

import { describe, expect, it } from "vitest";

import { applyAction } from "./Input.tsx";

describe("Input applyAction", () => {
  it("type 'hello' builds value correctly", () => {
    let state = { value: "", cursorPosition: 0, scrollOffset: 0 };

    for (const char of "hello") {
      state = applyAction(
        state.value,
        state.cursorPosition,
        state.scrollOffset,
        10,
        { type: "insert", char },
      );
    }

    expect(state.value).toBe("hello");
    expect(state.cursorPosition).toBe(5);
  });

  it("cursor at end, type appends", () => {
    const result = applyAction("abc", 3, 0, 10, { type: "insert", char: "d" });
    expect(result.value).toBe("abcd");
    expect(result.cursorPosition).toBe(4);
  });

  it("Home key moves cursor to start, type inserts at beginning", () => {
    let state = applyAction("hello", 5, 0, 10, { type: "home" });
    expect(state.cursorPosition).toBe(0);

    state = applyAction(
      state.value,
      state.cursorPosition,
      state.scrollOffset,
      10,
      { type: "insert", char: "X" },
    );
    expect(state.value).toBe("Xhello");
    expect(state.cursorPosition).toBe(1);
  });

  it("Backspace at start is a no-op", () => {
    const result = applyAction("hello", 0, 0, 10, { type: "backspace" });
    expect(result.value).toBe("hello");
    expect(result.cursorPosition).toBe(0);
  });

  it("Delete at end is a no-op", () => {
    const result = applyAction("hello", 5, 0, 10, { type: "delete" });
    expect(result.value).toBe("hello");
    expect(result.cursorPosition).toBe(5);
  });

  it("Backspace in the middle removes character before cursor", () => {
    const result = applyAction("hello", 3, 0, 10, { type: "backspace" });
    expect(result.value).toBe("helo");
    expect(result.cursorPosition).toBe(2);
  });

  it("Delete in the middle removes character at cursor", () => {
    const result = applyAction("hello", 2, 0, 10, { type: "delete" });
    expect(result.value).toBe("helo");
    expect(result.cursorPosition).toBe(2);
  });

  it("End key moves cursor to end", () => {
    const result = applyAction("hello", 0, 0, 10, { type: "end" });
    expect(result.cursorPosition).toBe(5);
  });

  it("moveLeft from start is a no-op", () => {
    const result = applyAction("hello", 0, 0, 10, { type: "moveLeft" });
    expect(result.cursorPosition).toBe(0);
  });

  it("moveRight from end is a no-op", () => {
    const result = applyAction("hello", 5, 0, 10, { type: "moveRight" });
    expect(result.cursorPosition).toBe(5);
  });

  it("overflow: typing beyond width advances scrollOffset", () => {
    let state = { value: "", cursorPosition: 0, scrollOffset: 0 };

    // Type 8 chars into a width-5 input
    for (const char of "abcdefgh") {
      state = applyAction(
        state.value,
        state.cursorPosition,
        state.scrollOffset,
        5,
        { type: "insert", char },
      );
    }

    expect(state.value).toBe("abcdefgh");
    expect(state.cursorPosition).toBe(8);
    // Cursor at 8, width 5 -> scroll should be at least 4
    expect(state.scrollOffset).toBe(4);
  });

  it("scrollOffset adjusts when cursor moves before visible window", () => {
    // Start with scrollOffset 4, cursor at 4
    const result = applyAction("abcdefgh", 4, 4, 5, { type: "moveLeft" });
    expect(result.cursorPosition).toBe(3);
    // Cursor 3 < scrollOffset 4 -> scroll adjusts to 3
    expect(result.scrollOffset).toBe(3);
  });
});

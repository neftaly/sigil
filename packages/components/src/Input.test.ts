import { describe, expect, it } from "vitest";

import { applyAction } from "./Input.tsx";

describe("Input applyAction — navigation", () => {
  it("moveLeft decrements cursor", () => {
    const result = applyAction("hello", 3, 3, 0, 10, { type: "moveLeft" });
    expect(result.selectionStart).toBe(2);
    expect(result.selectionEnd).toBe(2);
  });

  it("moveRight increments cursor", () => {
    const result = applyAction("hello", 2, 2, 0, 10, { type: "moveRight" });
    expect(result.selectionStart).toBe(3);
    expect(result.selectionEnd).toBe(3);
  });

  it("moveLeft from start is a no-op", () => {
    const result = applyAction("hello", 0, 0, 0, 10, { type: "moveLeft" });
    expect(result.selectionStart).toBe(0);
    expect(result.selectionEnd).toBe(0);
  });

  it("moveRight from end is a no-op", () => {
    const result = applyAction("hello", 5, 5, 0, 10, { type: "moveRight" });
    expect(result.selectionStart).toBe(5);
    expect(result.selectionEnd).toBe(5);
  });

  it("home moves cursor to start", () => {
    const result = applyAction("hello", 5, 5, 0, 10, { type: "home" });
    expect(result.selectionStart).toBe(0);
    expect(result.selectionEnd).toBe(0);
  });

  it("end moves cursor to end", () => {
    const result = applyAction("hello", 0, 0, 0, 10, { type: "end" });
    expect(result.selectionStart).toBe(5);
    expect(result.selectionEnd).toBe(5);
  });

  it("scrollOffset adjusts when cursor moves before visible window", () => {
    const result = applyAction("abcdefgh", 4, 4, 4, 5, { type: "moveLeft" });
    expect(result.selectionEnd).toBe(3);
    expect(result.scrollOffset).toBe(3);
  });

  it("end on long text adjusts scroll", () => {
    const result = applyAction("abcdefgh", 0, 0, 0, 5, { type: "end" });
    expect(result.selectionEnd).toBe(8);
    expect(result.scrollOffset).toBe(4);
  });
});

describe("Input applyAction — selection extension (shift)", () => {
  it("shift+right extends selection", () => {
    const result = applyAction("hello", 2, 2, 0, 10, {
      type: "moveRight",
      extend: true,
    });
    expect(result.selectionStart).toBe(2);
    expect(result.selectionEnd).toBe(3);
  });

  it("shift+left extends selection backward", () => {
    const result = applyAction("hello", 3, 3, 0, 10, {
      type: "moveLeft",
      extend: true,
    });
    expect(result.selectionStart).toBe(3);
    expect(result.selectionEnd).toBe(2);
  });

  it("shift+home selects to start", () => {
    const result = applyAction("hello", 3, 3, 0, 10, {
      type: "home",
      extend: true,
    });
    expect(result.selectionStart).toBe(3);
    expect(result.selectionEnd).toBe(0);
  });

  it("shift+end selects to end", () => {
    const result = applyAction("hello", 1, 1, 0, 10, {
      type: "end",
      extend: true,
    });
    expect(result.selectionStart).toBe(1);
    expect(result.selectionEnd).toBe(5);
  });

  it("right arrow collapses selection to the right", () => {
    const result = applyAction("hello", 1, 3, 0, 10, { type: "moveRight" });
    expect(result.selectionStart).toBe(3);
    expect(result.selectionEnd).toBe(3);
  });

  it("left arrow collapses selection to the left", () => {
    const result = applyAction("hello", 1, 3, 0, 10, { type: "moveLeft" });
    expect(result.selectionStart).toBe(1);
    expect(result.selectionEnd).toBe(1);
  });
});

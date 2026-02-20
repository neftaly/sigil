import { describe, expect, it } from "vitest";

import { measureText, wrapText } from "./measure.ts";

describe("measureText", () => {
  it("measures empty string as 0x0", () => {
    expect(measureText("", "nowrap", 100)).toEqual({ width: 0, height: 0 });
  });

  it("measures ASCII text width", () => {
    expect(measureText("Hello", "nowrap", 100)).toEqual({
      width: 5,
      height: 1,
    });
  });

  it("measures CJK characters as double width", () => {
    expect(measureText("你好", "nowrap", 100)).toEqual({ width: 4, height: 1 });
  });

  it("measures emoji as double width", () => {
    expect(measureText("👋", "nowrap", 100)).toEqual({ width: 2, height: 1 });
  });

  it("measures combining marks correctly", () => {
    // E + combining acute accent = 1 cell
    expect(measureText("e\u0301", "nowrap", 100)).toEqual({
      width: 1,
      height: 1,
    });
  });

  it("measures wrapped text height", () => {
    const result = measureText("Hello World", "wrap", 6);
    expect(result.height).toBe(2);
  });
});

describe("wrapText", () => {
  it("wraps at word boundaries", () => {
    expect(wrapText("Hello World", 6)).toEqual(["Hello ", "World"]);
  });

  it("keeps short text on one line", () => {
    expect(wrapText("Hi", 10)).toEqual(["Hi"]);
  });

  it("wraps multiple words", () => {
    expect(wrapText("one two three", 8)).toEqual(["one two ", "three"]);
  });

  it("handles words wider than maxWidth", () => {
    expect(wrapText("Superlongword", 5)).toEqual(["Superlongword"]);
  });

  it("returns one empty line for empty string", () => {
    expect(wrapText("", 10)).toEqual([""]);
  });
});

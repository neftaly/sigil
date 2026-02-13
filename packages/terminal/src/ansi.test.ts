import { describe, expect, it } from "vitest";

import type { Cell } from "@charui/core";

import { toAnsi } from "./ansi.ts";

function cell(char: string, style: Cell["style"] = {}): Cell {
  return { char, style };
}

describe("toAnsi", () => {
  it("converts plain text grid", () => {
    const grid: Cell[][] = [
      [cell("H"), cell("i")],
      [cell("! "), cell(" ")],
    ];
    expect(toAnsi(grid)).toBe("Hi\r\n!  ");
  });

  it("applies bold style", () => {
    const grid: Cell[][] = [[cell("B", { bold: true })]];
    expect(toAnsi(grid)).toBe("\x1b[1mB\x1b[0m");
  });

  it("applies italic style", () => {
    const grid: Cell[][] = [[cell("I", { italic: true })]];
    expect(toAnsi(grid)).toBe("\x1b[3mI\x1b[0m");
  });

  it("applies underline style", () => {
    const grid: Cell[][] = [[cell("U", { underline: true })]];
    expect(toAnsi(grid)).toBe("\x1b[4mU\x1b[0m");
  });

  it("applies foreground color", () => {
    const grid: Cell[][] = [[cell("R", { fg: "#ff0000" })]];
    expect(toAnsi(grid)).toBe("\x1b[38;2;255;0;0mR\x1b[0m");
  });

  it("applies background color", () => {
    const grid: Cell[][] = [[cell("B", { bg: "#00ff00" })]];
    expect(toAnsi(grid)).toBe("\x1b[48;2;0;255;0mB\x1b[0m");
  });

  it("applies multiple styles", () => {
    const grid: Cell[][] = [[cell("X", { bold: true, fg: "#ff0000" })]];
    const result = toAnsi(grid);
    expect(result).toContain("\x1b[1m");
    expect(result).toContain("\x1b[38;2;255;0;0m");
    expect(result).toContain("X");
    expect(result).toContain("\x1b[0m");
  });

  it("resets style between differently-styled spans", () => {
    const grid: Cell[][] = [
      [cell("A", { fg: "#ff0000" }), cell("B", { fg: "#0000ff" })],
    ];
    const result = toAnsi(grid);
    // Should have reset between A and B
    expect(result).toContain("\x1b[0m");
    expect(result).toContain("\x1b[38;2;255;0;0m");
    expect(result).toContain("\x1b[38;2;0;0;255m");
  });

  it("groups consecutive cells with same style", () => {
    const style = { fg: "#ff0000" };
    const grid: Cell[][] = [[cell("A", style), cell("B", style)]];
    const result = toAnsi(grid);
    // Should be one styled span "AB", not two separate ones
    expect(result).toBe("\x1b[38;2;255;0;0mAB\x1b[0m");
  });

  it("handles empty grid", () => {
    expect(toAnsi([])).toBe("");
  });

  it("handles named colors", () => {
    const grid: Cell[][] = [[cell("R", { fg: "red" })]];
    expect(toAnsi(grid)).toBe("\x1b[38;2;255;0;0mR\x1b[0m");
  });

  it("skips continuation cells", () => {
    const grid: Cell[][] = [
      [
        { char: "你", style: {} },
        { char: "", style: {}, continuation: true },
        cell("A"),
      ],
    ];
    expect(toAnsi(grid)).toBe("你A");
  });
});

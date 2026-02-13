import { describe, expect, it } from "vitest";

import { parseColor } from "./color.ts";

describe("parseColor", () => {
  it("parses #rrggbb hex colors", () => {
    expect(parseColor("#ff0000")).toEqual([255, 0, 0]);
    expect(parseColor("#00ff00")).toEqual([0, 255, 0]);
    expect(parseColor("#0000ff")).toEqual([0, 0, 255]);
    expect(parseColor("#000000")).toEqual([0, 0, 0]);
    expect(parseColor("#ffffff")).toEqual([255, 255, 255]);
  });

  it("parses #rgb shorthand", () => {
    expect(parseColor("#f00")).toEqual([255, 0, 0]);
    expect(parseColor("#0f0")).toEqual([0, 255, 0]);
    expect(parseColor("#00f")).toEqual([0, 0, 255]);
    expect(parseColor("#fff")).toEqual([255, 255, 255]);
    expect(parseColor("#abc")).toEqual([170, 187, 204]);
  });

  it("parses named CSS colors", () => {
    expect(parseColor("red")).toEqual([255, 0, 0]);
    expect(parseColor("blue")).toEqual([0, 0, 255]);
    expect(parseColor("white")).toEqual([255, 255, 255]);
    expect(parseColor("black")).toEqual([0, 0, 0]);
    expect(parseColor("rebeccapurple")).toEqual([102, 51, 153]);
  });

  it("is case-insensitive", () => {
    expect(parseColor("RED")).toEqual([255, 0, 0]);
    expect(parseColor("Red")).toEqual([255, 0, 0]);
    expect(parseColor("#FF0000")).toEqual([255, 0, 0]);
    expect(parseColor("#Ff0000")).toEqual([255, 0, 0]);
  });

  it("trims whitespace", () => {
    expect(parseColor("  red  ")).toEqual([255, 0, 0]);
    expect(parseColor("  #ff0000  ")).toEqual([255, 0, 0]);
  });

  it("returns null for unrecognized values", () => {
    expect(parseColor("")).toBeNull();
    expect(parseColor("notacolor")).toBeNull();
    expect(parseColor("#gg0000")).toBeNull();
    expect(parseColor("#12345")).toBeNull();
    expect(parseColor("rgb(255,0,0)")).toBeNull();
  });
});

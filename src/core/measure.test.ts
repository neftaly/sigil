import { describe, expect, it } from "vitest";

import {
  addNode,
  computeLayout,
  createDatabase,
} from "./database.ts";
import { measureText, setTextMeasureFunc, wrapText } from "./measure.ts";
import { applyYogaStyles } from "./yoga-styles.ts";

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

describe("setTextMeasureFunc", () => {
  it("sets measureFunc for simple text", () => {
    const database = createDatabase();
    const root = addNode(database, {
      id: "root",
      type: "box",
      props: { alignItems: "flex-start" },
      parentId: null,
    });
    const textNode = addNode(database, {
      id: "text",
      type: "text",
      props: { content: "Hello" },
      parentId: "root",
    });

    applyYogaStyles(root, root.props);
    applyYogaStyles(textNode, textNode.props);
    setTextMeasureFunc(textNode, { content: "Hello" });
    computeLayout(database, 80, 24);

    expect(textNode.bounds?.width).toBe(5);
    expect(textNode.bounds?.height).toBe(1);
  });

  it("wraps text when wrap prop is true", () => {
    const database = createDatabase();
    const root = addNode(database, {
      id: "root",
      type: "box",
      props: { width: 10 },
      parentId: null,
    });
    const textNode = addNode(database, {
      id: "text",
      type: "text",
      props: { content: "Hello World!", wrap: true },
      parentId: "root",
    });

    applyYogaStyles(root, root.props);
    applyYogaStyles(textNode, textNode.props);
    setTextMeasureFunc(textNode, { content: "Hello World!", wrap: true });
    computeLayout(database, 80, 24);

    expect(textNode.bounds!.height).toBeGreaterThan(1);
  });

  it("handles empty content", () => {
    const database = createDatabase();
    const root = addNode(database, {
      id: "root",
      type: "box",
      props: { alignItems: "flex-start" },
      parentId: null,
    });
    const textNode = addNode(database, {
      id: "text",
      type: "text",
      props: { content: "" },
      parentId: "root",
    });

    applyYogaStyles(root, root.props);
    applyYogaStyles(textNode, textNode.props);
    setTextMeasureFunc(textNode, { content: "" });
    computeLayout(database, 80, 24);

    expect(textNode.bounds?.width).toBe(0);
    expect(textNode.bounds?.height).toBe(0);
  });

  it("nowrap mode keeps text on single line", () => {
    const database = createDatabase();
    const root = addNode(database, {
      id: "root",
      type: "box",
      props: { width: 10 },
      parentId: null,
    });
    const textNode = addNode(database, {
      id: "text",
      type: "text",
      props: { content: "This is a long piece of text that should not wrap" },
      parentId: "root",
    });

    applyYogaStyles(root, root.props);
    applyYogaStyles(textNode, textNode.props);
    setTextMeasureFunc(textNode, {
      content: "This is a long piece of text that should not wrap",
    });
    computeLayout(database, 80, 24);

    expect(textNode.bounds?.height).toBe(1);
  });
});

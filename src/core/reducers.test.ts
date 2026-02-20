import { describe, expect, it } from "vitest";

import {
  type RangeConfig,
  type RangeState,
  type SelectionState,
  type TextInputState,
  rangeReducer,
  selectionReducer,
  textInputReducer,
} from "./reducers.ts";

// --- selectionReducer ---

describe("selectionReducer", () => {
  const initial: SelectionState = { index: 2 };

  describe("moveUp", () => {
    it("decrements the index", () => {
      expect(selectionReducer(initial, { type: "moveUp" }, 5)).toEqual({
        index: 1,
      });
    });

    it("clamps to 0", () => {
      expect(
        selectionReducer({ index: 0 }, { type: "moveUp" }, 5),
      ).toEqual({ index: 0 });
    });
  });

  describe("moveDown", () => {
    it("increments the index", () => {
      expect(selectionReducer(initial, { type: "moveDown" }, 5)).toEqual({
        index: 3,
      });
    });

    it("clamps to count - 1", () => {
      expect(
        selectionReducer({ index: 4 }, { type: "moveDown" }, 5),
      ).toEqual({ index: 4 });
    });
  });

  describe("moveToStart", () => {
    it("sets index to 0", () => {
      expect(selectionReducer(initial, { type: "moveToStart" }, 5)).toEqual({
        index: 0,
      });
    });
  });

  describe("moveToEnd", () => {
    it("sets index to count - 1", () => {
      expect(selectionReducer(initial, { type: "moveToEnd" }, 5)).toEqual({
        index: 4,
      });
    });
  });

  describe("moveTo", () => {
    it("sets index to given value", () => {
      expect(
        selectionReducer(initial, { type: "moveTo", index: 3 }, 5),
      ).toEqual({ index: 3 });
    });

    it("clamps to 0 when negative", () => {
      expect(
        selectionReducer(initial, { type: "moveTo", index: -1 }, 5),
      ).toEqual({ index: 0 });
    });

    it("clamps to count - 1 when too large", () => {
      expect(
        selectionReducer(initial, { type: "moveTo", index: 10 }, 5),
      ).toEqual({ index: 4 });
    });
  });

  describe("edge cases", () => {
    it("returns index 0 when count is 0", () => {
      expect(selectionReducer(initial, { type: "moveUp" }, 0)).toEqual({
        index: 0,
      });
      expect(selectionReducer(initial, { type: "moveDown" }, 0)).toEqual({
        index: 0,
      });
      expect(selectionReducer(initial, { type: "moveToStart" }, 0)).toEqual({
        index: 0,
      });
      expect(selectionReducer(initial, { type: "moveToEnd" }, 0)).toEqual({
        index: 0,
      });
      expect(
        selectionReducer(initial, { type: "moveTo", index: 3 }, 0),
      ).toEqual({ index: 0 });
    });

    it("returns index 0 when count is negative", () => {
      expect(selectionReducer(initial, { type: "moveDown" }, -1)).toEqual({
        index: 0,
      });
    });

    it("handles single-item list", () => {
      expect(
        selectionReducer({ index: 0 }, { type: "moveDown" }, 1),
      ).toEqual({ index: 0 });
      expect(
        selectionReducer({ index: 0 }, { type: "moveUp" }, 1),
      ).toEqual({ index: 0 });
    });
  });
});

// --- rangeReducer ---

describe("rangeReducer", () => {
  const config: RangeConfig = { min: 0, max: 10, step: 1 };
  const initial: RangeState = { value: 5 };

  describe("increment", () => {
    it("adds step to value", () => {
      expect(rangeReducer(initial, { type: "increment" }, config)).toEqual({
        value: 6,
      });
    });

    it("clamps to max", () => {
      expect(
        rangeReducer({ value: 10 }, { type: "increment" }, config),
      ).toEqual({ value: 10 });
    });

    it("clamps to max when step overshoots", () => {
      expect(
        rangeReducer(
          { value: 8 },
          { type: "increment" },
          { min: 0, max: 10, step: 5 },
        ),
      ).toEqual({ value: 10 });
    });
  });

  describe("decrement", () => {
    it("subtracts step from value", () => {
      expect(rangeReducer(initial, { type: "decrement" }, config)).toEqual({
        value: 4,
      });
    });

    it("clamps to min", () => {
      expect(
        rangeReducer({ value: 0 }, { type: "decrement" }, config),
      ).toEqual({ value: 0 });
    });

    it("clamps to min when step overshoots", () => {
      expect(
        rangeReducer(
          { value: 2 },
          { type: "decrement" },
          { min: 0, max: 10, step: 5 },
        ),
      ).toEqual({ value: 0 });
    });
  });

  describe("setToMin", () => {
    it("sets value to min", () => {
      expect(rangeReducer(initial, { type: "setToMin" }, config)).toEqual({
        value: 0,
      });
    });
  });

  describe("setToMax", () => {
    it("sets value to max", () => {
      expect(rangeReducer(initial, { type: "setToMax" }, config)).toEqual({
        value: 10,
      });
    });
  });

  describe("setTo", () => {
    it("sets value to given amount", () => {
      expect(
        rangeReducer(initial, { type: "setTo", value: 7 }, config),
      ).toEqual({ value: 7 });
    });

    it("clamps to min", () => {
      expect(
        rangeReducer(initial, { type: "setTo", value: -5 }, config),
      ).toEqual({ value: 0 });
    });

    it("clamps to max", () => {
      expect(
        rangeReducer(initial, { type: "setTo", value: 20 }, config),
      ).toEqual({ value: 10 });
    });
  });

  describe("edge cases", () => {
    it("works with negative range", () => {
      const negConfig: RangeConfig = { min: -10, max: -1, step: 2 };
      expect(
        rangeReducer({ value: -5 }, { type: "increment" }, negConfig),
      ).toEqual({ value: -3 });
      expect(
        rangeReducer({ value: -5 }, { type: "decrement" }, negConfig),
      ).toEqual({ value: -7 });
    });

    it("works with fractional step", () => {
      const fracConfig: RangeConfig = { min: 0, max: 1, step: 0.1 };
      const result = rangeReducer(
        { value: 0.5 },
        { type: "increment" },
        fracConfig,
      );
      expect(result.value).toBeCloseTo(0.6);
    });

    it("handles step larger than range", () => {
      const bigStep: RangeConfig = { min: 0, max: 5, step: 100 };
      expect(
        rangeReducer({ value: 3 }, { type: "increment" }, bigStep),
      ).toEqual({ value: 5 });
      expect(
        rangeReducer({ value: 3 }, { type: "decrement" }, bigStep),
      ).toEqual({ value: 0 });
    });
  });
});

// --- textInputReducer ---

describe("textInputReducer", () => {
  function makeState(
    value: string,
    cursor: number,
    selStart: number | null = null,
    selEnd: number | null = null,
  ): TextInputState {
    return {
      value,
      cursor,
      selectionStart: selStart,
      selectionEnd: selEnd,
    };
  }

  describe("insert", () => {
    it("inserts text at cursor", () => {
      const state = makeState("hello", 5);
      const result = textInputReducer(state, { type: "insert", text: " world" });
      expect(result.value).toBe("hello world");
      expect(result.cursor).toBe(11);
    });

    it("inserts text in the middle", () => {
      const state = makeState("hllo", 1);
      const result = textInputReducer(state, { type: "insert", text: "e" });
      expect(result.value).toBe("hello");
      expect(result.cursor).toBe(2);
    });

    it("replaces selection with text", () => {
      const state = makeState("hello world", 0, 0, 5);
      const result = textInputReducer(state, { type: "insert", text: "hi" });
      expect(result.value).toBe("hi world");
      expect(result.cursor).toBe(2);
      expect(result.selectionStart).toBeNull();
      expect(result.selectionEnd).toBeNull();
    });

    it("replaces reversed selection with text", () => {
      const state = makeState("hello world", 5, 5, 0);
      const result = textInputReducer(state, { type: "insert", text: "hi" });
      expect(result.value).toBe("hi world");
      expect(result.cursor).toBe(2);
    });

    it("clears selection after insert", () => {
      const state = makeState("abc", 1, 0, 3);
      const result = textInputReducer(state, { type: "insert", text: "x" });
      expect(result.value).toBe("x");
      expect(result.selectionStart).toBeNull();
      expect(result.selectionEnd).toBeNull();
    });
  });

  describe("delete", () => {
    it("deletes character after cursor", () => {
      const state = makeState("hello", 0);
      const result = textInputReducer(state, { type: "delete" });
      expect(result.value).toBe("ello");
      expect(result.cursor).toBe(0);
    });

    it("does nothing at end of string", () => {
      const state = makeState("hello", 5);
      const result = textInputReducer(state, { type: "delete" });
      expect(result).toBe(state);
    });

    it("deletes selection instead of single char", () => {
      const state = makeState("hello world", 0, 0, 5);
      const result = textInputReducer(state, { type: "delete" });
      expect(result.value).toBe(" world");
      expect(result.cursor).toBe(0);
      expect(result.selectionStart).toBeNull();
    });
  });

  describe("backspace", () => {
    it("deletes character before cursor", () => {
      const state = makeState("hello", 5);
      const result = textInputReducer(state, { type: "backspace" });
      expect(result.value).toBe("hell");
      expect(result.cursor).toBe(4);
    });

    it("does nothing at start of string", () => {
      const state = makeState("hello", 0);
      const result = textInputReducer(state, { type: "backspace" });
      expect(result).toBe(state);
    });

    it("deletes selection instead of single char", () => {
      const state = makeState("hello world", 5, 5, 11);
      const result = textInputReducer(state, { type: "backspace" });
      expect(result.value).toBe("hello");
      expect(result.cursor).toBe(5);
      expect(result.selectionStart).toBeNull();
    });

    it("deletes in the middle", () => {
      const state = makeState("hello", 3);
      const result = textInputReducer(state, { type: "backspace" });
      expect(result.value).toBe("helo");
      expect(result.cursor).toBe(2);
    });
  });

  describe("moveCursorLeft", () => {
    it("moves cursor left by one", () => {
      const state = makeState("hello", 3);
      const result = textInputReducer(state, { type: "moveCursorLeft" });
      expect(result.cursor).toBe(2);
      expect(result.selectionStart).toBeNull();
    });

    it("clamps to 0", () => {
      const state = makeState("hello", 0);
      const result = textInputReducer(state, { type: "moveCursorLeft" });
      expect(result.cursor).toBe(0);
    });

    it("collapses selection to left edge without shift", () => {
      const state = makeState("hello", 4, 1, 4);
      const result = textInputReducer(state, { type: "moveCursorLeft" });
      expect(result.cursor).toBe(1);
      expect(result.selectionStart).toBeNull();
      expect(result.selectionEnd).toBeNull();
    });

    it("extends selection with shift", () => {
      const state = makeState("hello", 3);
      const result = textInputReducer(state, {
        type: "moveCursorLeft",
        shift: true,
      });
      expect(result.cursor).toBe(2);
      expect(result.selectionStart).toBe(3);
      expect(result.selectionEnd).toBe(2);
    });

    it("extends existing selection with shift", () => {
      const state = makeState("hello", 2, 3, 2);
      const result = textInputReducer(state, {
        type: "moveCursorLeft",
        shift: true,
      });
      expect(result.cursor).toBe(1);
      expect(result.selectionStart).toBe(3);
      expect(result.selectionEnd).toBe(1);
    });
  });

  describe("moveCursorRight", () => {
    it("moves cursor right by one", () => {
      const state = makeState("hello", 3);
      const result = textInputReducer(state, { type: "moveCursorRight" });
      expect(result.cursor).toBe(4);
      expect(result.selectionStart).toBeNull();
    });

    it("clamps to value.length", () => {
      const state = makeState("hello", 5);
      const result = textInputReducer(state, { type: "moveCursorRight" });
      expect(result.cursor).toBe(5);
    });

    it("collapses selection to right edge without shift", () => {
      const state = makeState("hello", 1, 1, 4);
      const result = textInputReducer(state, { type: "moveCursorRight" });
      expect(result.cursor).toBe(4);
      expect(result.selectionStart).toBeNull();
      expect(result.selectionEnd).toBeNull();
    });

    it("extends selection with shift", () => {
      const state = makeState("hello", 3);
      const result = textInputReducer(state, {
        type: "moveCursorRight",
        shift: true,
      });
      expect(result.cursor).toBe(4);
      expect(result.selectionStart).toBe(3);
      expect(result.selectionEnd).toBe(4);
    });
  });

  describe("moveCursorToStart", () => {
    it("moves cursor to 0", () => {
      const state = makeState("hello", 3);
      const result = textInputReducer(state, { type: "moveCursorToStart" });
      expect(result.cursor).toBe(0);
      expect(result.selectionStart).toBeNull();
    });

    it("extends selection with shift", () => {
      const state = makeState("hello", 3);
      const result = textInputReducer(state, {
        type: "moveCursorToStart",
        shift: true,
      });
      expect(result.cursor).toBe(0);
      expect(result.selectionStart).toBe(3);
      expect(result.selectionEnd).toBe(0);
    });
  });

  describe("moveCursorToEnd", () => {
    it("moves cursor to value.length", () => {
      const state = makeState("hello", 0);
      const result = textInputReducer(state, { type: "moveCursorToEnd" });
      expect(result.cursor).toBe(5);
      expect(result.selectionStart).toBeNull();
    });

    it("extends selection with shift", () => {
      const state = makeState("hello", 2);
      const result = textInputReducer(state, {
        type: "moveCursorToEnd",
        shift: true,
      });
      expect(result.cursor).toBe(5);
      expect(result.selectionStart).toBe(2);
      expect(result.selectionEnd).toBe(5);
    });
  });

  describe("selectAll", () => {
    it("selects entire value", () => {
      const state = makeState("hello", 2);
      const result = textInputReducer(state, { type: "selectAll" });
      expect(result.selectionStart).toBe(0);
      expect(result.selectionEnd).toBe(5);
      expect(result.cursor).toBe(5);
    });

    it("works on empty string", () => {
      const state = makeState("", 0);
      const result = textInputReducer(state, { type: "selectAll" });
      expect(result.selectionStart).toBe(0);
      expect(result.selectionEnd).toBe(0);
    });
  });

  describe("setValue", () => {
    it("replaces value entirely", () => {
      const state = makeState("hello", 3);
      const result = textInputReducer(state, {
        type: "setValue",
        value: "world",
      });
      expect(result.value).toBe("world");
      expect(result.cursor).toBe(5);
      expect(result.selectionStart).toBeNull();
    });

    it("sets cursor position when provided", () => {
      const state = makeState("hello", 3);
      const result = textInputReducer(state, {
        type: "setValue",
        value: "world",
        cursor: 2,
      });
      expect(result.value).toBe("world");
      expect(result.cursor).toBe(2);
    });

    it("clamps cursor to value length", () => {
      const state = makeState("hello", 3);
      const result = textInputReducer(state, {
        type: "setValue",
        value: "hi",
        cursor: 100,
      });
      expect(result.cursor).toBe(2);
    });

    it("clamps cursor to 0 for negative values", () => {
      const state = makeState("hello", 3);
      const result = textInputReducer(state, {
        type: "setValue",
        value: "hi",
        cursor: -5,
      });
      expect(result.cursor).toBe(0);
    });

    it("clears selection", () => {
      const state = makeState("hello", 3, 0, 5);
      const result = textInputReducer(state, {
        type: "setValue",
        value: "world",
      });
      expect(result.selectionStart).toBeNull();
      expect(result.selectionEnd).toBeNull();
    });
  });

  describe("boundary cases", () => {
    it("handles empty string operations", () => {
      const state = makeState("", 0);
      expect(textInputReducer(state, { type: "delete" })).toBe(state);
      expect(textInputReducer(state, { type: "backspace" })).toBe(state);
      expect(textInputReducer(state, { type: "moveCursorLeft" }).cursor).toBe(
        0,
      );
      expect(textInputReducer(state, { type: "moveCursorRight" }).cursor).toBe(
        0,
      );
    });

    it("insert on empty string works", () => {
      const state = makeState("", 0);
      const result = textInputReducer(state, { type: "insert", text: "a" });
      expect(result.value).toBe("a");
      expect(result.cursor).toBe(1);
    });

    it("multi-character insert", () => {
      const state = makeState("ac", 1);
      const result = textInputReducer(state, { type: "insert", text: "bb" });
      expect(result.value).toBe("abbc");
      expect(result.cursor).toBe(3);
    });
  });
});

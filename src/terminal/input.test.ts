import { describe, expect, it } from "vitest";

import { parseInput, type ParsedEvent } from "./input.ts";

// --- Helpers ---

/** Shorthand to parse a string as if it were stdin data. */
function parse(input: string): ParsedEvent[] {
  return parseInput(Buffer.from(input, "utf-8"));
}

/** Extract just the key events from parsed output. */
function keys(input: string) {
  return parse(input)
    .filter((e) => e.kind === "key")
    .map((e) => e.event);
}

/** Extract the first key event. */
function key(input: string) {
  const all = keys(input);
  expect(all.length).toBeGreaterThanOrEqual(1);
  return all[0];
}

// --- Tests ---

describe("parseInput", () => {
  describe("plain printable characters", () => {
    it("parses a single character", () => {
      const k = key("a");
      expect(k.key).toBe("a");
      expect(k.type).toBe("keydown");
      expect(k.ctrlKey).toBe(false);
      expect(k.shiftKey).toBe(false);
      expect(k.altKey).toBe(false);
      expect(k.metaKey).toBe(false);
    });

    it("parses multiple characters as separate events", () => {
      const all = keys("abc");
      expect(all).toHaveLength(3);
      expect(all[0].key).toBe("a");
      expect(all[1].key).toBe("b");
      expect(all[2].key).toBe("c");
    });

    it("parses space", () => {
      const k = key(" ");
      expect(k.key).toBe(" ");
      expect(k.code).toBe("Space");
    });

    it("parses digits", () => {
      const k = key("5");
      expect(k.key).toBe("5");
      expect(k.code).toBe("Digit5");
    });

    it("maps letters to KeyX codes", () => {
      const k = key("a");
      expect(k.code).toBe("KeyA");
    });
  });

  describe("control characters", () => {
    it("parses Enter (\\r)", () => {
      const k = key("\r");
      expect(k.key).toBe("Enter");
      expect(k.code).toBe("Enter");
    });

    it("parses Enter (\\n)", () => {
      const k = key("\n");
      expect(k.key).toBe("Enter");
    });

    it("parses Tab", () => {
      const k = key("\t");
      expect(k.key).toBe("Tab");
      expect(k.code).toBe("Tab");
    });

    it("parses Backspace", () => {
      const k = key("\x7f");
      expect(k.key).toBe("Backspace");
      expect(k.code).toBe("Backspace");
    });
  });

  describe("Ctrl+letter", () => {
    it("parses Ctrl+a (0x01)", () => {
      const k = key("\x01");
      expect(k.key).toBe("a");
      expect(k.ctrlKey).toBe(true);
    });

    it("parses Ctrl+c (0x03)", () => {
      const k = key("\x03");
      expect(k.key).toBe("c");
      expect(k.ctrlKey).toBe(true);
    });

    it("parses Ctrl+z (0x1a)", () => {
      const k = key("\x1a");
      expect(k.key).toBe("z");
      expect(k.ctrlKey).toBe(true);
    });

    it("parses Ctrl+l (0x0c)", () => {
      const k = key("\x0c");
      expect(k.key).toBe("l");
      expect(k.ctrlKey).toBe(true);
    });
  });

  describe("Escape key", () => {
    it("parses bare ESC as Escape", () => {
      const k = key("\x1b");
      expect(k.key).toBe("Escape");
      expect(k.code).toBe("Escape");
    });
  });

  describe("arrow keys", () => {
    it("parses ArrowUp", () => {
      const k = key("\x1b[A");
      expect(k.key).toBe("ArrowUp");
    });

    it("parses ArrowDown", () => {
      const k = key("\x1b[B");
      expect(k.key).toBe("ArrowDown");
    });

    it("parses ArrowRight", () => {
      const k = key("\x1b[C");
      expect(k.key).toBe("ArrowRight");
    });

    it("parses ArrowLeft", () => {
      const k = key("\x1b[D");
      expect(k.key).toBe("ArrowLeft");
    });
  });

  describe("navigation keys", () => {
    it("parses Home", () => {
      const k = key("\x1b[H");
      expect(k.key).toBe("Home");
    });

    it("parses End", () => {
      const k = key("\x1b[F");
      expect(k.key).toBe("End");
    });

    it("parses Insert", () => {
      const k = key("\x1b[2~");
      expect(k.key).toBe("Insert");
    });

    it("parses Delete", () => {
      const k = key("\x1b[3~");
      expect(k.key).toBe("Delete");
    });

    it("parses PageUp", () => {
      const k = key("\x1b[5~");
      expect(k.key).toBe("PageUp");
    });

    it("parses PageDown", () => {
      const k = key("\x1b[6~");
      expect(k.key).toBe("PageDown");
    });
  });

  describe("Shift+Tab", () => {
    it("parses ESC[Z as Shift+Tab", () => {
      const k = key("\x1b[Z");
      expect(k.key).toBe("Tab");
      expect(k.shiftKey).toBe(true);
    });
  });

  describe("modifier combinations", () => {
    it("parses Shift+ArrowUp (modifier 2)", () => {
      const k = key("\x1b[1;2A");
      expect(k.key).toBe("ArrowUp");
      expect(k.shiftKey).toBe(true);
      expect(k.ctrlKey).toBe(false);
      expect(k.altKey).toBe(false);
    });

    it("parses Alt+ArrowUp (modifier 3)", () => {
      const k = key("\x1b[1;3A");
      expect(k.key).toBe("ArrowUp");
      expect(k.altKey).toBe(true);
      expect(k.shiftKey).toBe(false);
      expect(k.ctrlKey).toBe(false);
    });

    it("parses Shift+Alt+ArrowUp (modifier 4)", () => {
      const k = key("\x1b[1;4A");
      expect(k.key).toBe("ArrowUp");
      expect(k.shiftKey).toBe(true);
      expect(k.altKey).toBe(true);
      expect(k.ctrlKey).toBe(false);
    });

    it("parses Ctrl+ArrowUp (modifier 5)", () => {
      const k = key("\x1b[1;5A");
      expect(k.key).toBe("ArrowUp");
      expect(k.ctrlKey).toBe(true);
      expect(k.shiftKey).toBe(false);
      expect(k.altKey).toBe(false);
    });

    it("parses Ctrl+Shift+ArrowRight (modifier 6)", () => {
      const k = key("\x1b[1;6C");
      expect(k.key).toBe("ArrowRight");
      expect(k.ctrlKey).toBe(true);
      expect(k.shiftKey).toBe(true);
      expect(k.altKey).toBe(false);
    });

    it("parses Ctrl+Alt+ArrowDown (modifier 7)", () => {
      const k = key("\x1b[1;7B");
      expect(k.key).toBe("ArrowDown");
      expect(k.ctrlKey).toBe(true);
      expect(k.altKey).toBe(true);
      expect(k.shiftKey).toBe(false);
    });

    it("parses Ctrl+Shift+Alt+ArrowLeft (modifier 8)", () => {
      const k = key("\x1b[1;8D");
      expect(k.key).toBe("ArrowLeft");
      expect(k.ctrlKey).toBe(true);
      expect(k.shiftKey).toBe(true);
      expect(k.altKey).toBe(true);
    });

    it("parses Shift+Delete (ESC[3;2~)", () => {
      const k = key("\x1b[3;2~");
      expect(k.key).toBe("Delete");
      expect(k.shiftKey).toBe(true);
    });

    it("parses Ctrl+PageUp (ESC[5;5~)", () => {
      const k = key("\x1b[5;5~");
      expect(k.key).toBe("PageUp");
      expect(k.ctrlKey).toBe(true);
    });
  });

  describe("SGR mouse sequences", () => {
    it("parses pointerdown (left button)", () => {
      const events = parse("\x1b[<0;5;3M");
      expect(events).toHaveLength(1);
      expect(events[0].kind).toBe("pointer");
      const pe = (events[0] as { kind: "pointer"; event: { type: string; col: number; row: number; button: number } }).event;
      expect(pe.type).toBe("pointerdown");
      expect(pe.col).toBe(4);
      expect(pe.row).toBe(2);
      expect(pe.button).toBe(0);
    });

    it("parses pointerup (release)", () => {
      const events = parse("\x1b[<0;5;3m");
      expect(events).toHaveLength(1);
      const pe = (events[0] as { kind: "pointer"; event: { type: string } }).event;
      expect(pe.type).toBe("pointerup");
    });

    it("parses pointermove (motion)", () => {
      const events = parse("\x1b[<32;10;20M");
      expect(events).toHaveLength(1);
      const pe = (events[0] as { kind: "pointer"; event: { type: string; col: number; row: number } }).event;
      expect(pe.type).toBe("pointermove");
      expect(pe.col).toBe(9);
      expect(pe.row).toBe(19);
    });

    it("parses right button click", () => {
      const events = parse("\x1b[<2;1;1M");
      const pe = (events[0] as { kind: "pointer"; event: { button: number } }).event;
      expect(pe.button).toBe(2);
    });
  });

  describe("bracketed paste", () => {
    it("parses a complete paste sequence", () => {
      const events = parse("\x1b[200~Hello, world!\x1b[201~");
      expect(events).toHaveLength(1);
      expect(events[0].kind).toBe("paste");
      expect((events[0] as { kind: "paste"; text: string }).text).toBe(
        "Hello, world!",
      );
    });

    it("parses paste with special characters", () => {
      const events = parse("\x1b[200~line1\nline2\ttab\x1b[201~");
      expect(events).toHaveLength(1);
      expect((events[0] as { kind: "paste"; text: string }).text).toBe(
        "line1\nline2\ttab",
      );
    });

    it("handles paste followed by normal input", () => {
      const events = parse("\x1b[200~pasted\x1b[201~a");
      expect(events).toHaveLength(2);
      expect(events[0].kind).toBe("paste");
      expect((events[0] as { kind: "paste"; text: string }).text).toBe(
        "pasted",
      );
      expect(events[1].kind).toBe("key");
      expect(
        (events[1] as { kind: "key"; event: { key: string } }).event.key,
      ).toBe("a");
    });

    it("handles incomplete paste (no end marker)", () => {
      const events = parse("\x1b[200~no end marker");
      expect(events).toHaveLength(1);
      expect(events[0].kind).toBe("paste");
      expect((events[0] as { kind: "paste"; text: string }).text).toBe(
        "no end marker",
      );
    });

    it("handles empty paste", () => {
      const events = parse("\x1b[200~\x1b[201~");
      expect(events).toHaveLength(1);
      expect((events[0] as { kind: "paste"; text: string }).text).toBe("");
    });
  });

  describe("mixed sequences", () => {
    it("handles key followed by mouse", () => {
      const events = parse("a\x1b[<0;1;1M");
      expect(events).toHaveLength(2);
      expect(events[0].kind).toBe("key");
      expect(events[1].kind).toBe("pointer");
    });

    it("handles multiple arrow keys in a row", () => {
      const all = keys("\x1b[A\x1b[B\x1b[C");
      expect(all).toHaveLength(3);
      expect(all[0].key).toBe("ArrowUp");
      expect(all[1].key).toBe("ArrowDown");
      expect(all[2].key).toBe("ArrowRight");
    });

    it("handles ctrl key followed by printable", () => {
      const events = parse("\x03x");
      expect(events).toHaveLength(2);
      expect(events[0].kind).toBe("key");
      const k1 = (events[0] as { kind: "key"; event: { key: string; ctrlKey: boolean } }).event;
      expect(k1.key).toBe("c");
      expect(k1.ctrlKey).toBe(true);
      const k2 = (events[1] as { kind: "key"; event: { key: string; ctrlKey: boolean } }).event;
      expect(k2.key).toBe("x");
      expect(k2.ctrlKey).toBe(false);
    });
  });
});

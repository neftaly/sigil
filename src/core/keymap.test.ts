import { describe, expect, it } from "vitest";

import { type Keymap, listBindings, matchAction } from "./keymap.ts";

const TEST_KEYMAP = {
  moveUp: { keys: ["ArrowUp", "k"], description: "Move up" },
  moveDown: { keys: ["ArrowDown", "j"], description: "Move down" },
  confirm: { keys: ["Enter"], description: "Select" },
  save: { keys: ["Ctrl+s"], description: "Save" },
  redo: { keys: ["Ctrl+Shift+z"], description: "Redo" },
} satisfies Keymap;

describe("matchAction", () => {
  it("matches a basic key", () => {
    expect(matchAction(TEST_KEYMAP, undefined, { key: "ArrowUp" })).toBe(
      "moveUp",
    );
    expect(matchAction(TEST_KEYMAP, undefined, { key: "k" })).toBe("moveUp");
    expect(matchAction(TEST_KEYMAP, undefined, { key: "j" })).toBe("moveDown");
    expect(matchAction(TEST_KEYMAP, undefined, { key: "Enter" })).toBe(
      "confirm",
    );
  });

  it("returns null when no key matches", () => {
    expect(matchAction(TEST_KEYMAP, undefined, { key: "x" })).toBeNull();
    expect(matchAction(TEST_KEYMAP, undefined, { key: "Escape" })).toBeNull();
  });

  it("uses override keys instead of defaults", () => {
    const overrides = { moveUp: ["w"] as string[] };
    expect(matchAction(TEST_KEYMAP, overrides, { key: "w" })).toBe("moveUp");
    // Default key no longer works when overridden
    expect(matchAction(TEST_KEYMAP, overrides, { key: "ArrowUp" })).toBeNull();
    expect(matchAction(TEST_KEYMAP, overrides, { key: "k" })).toBeNull();
  });

  it("disables an action when override is null", () => {
    const overrides = { confirm: null };
    expect(matchAction(TEST_KEYMAP, overrides, { key: "Enter" })).toBeNull();
  });

  it("matches modifier key combinations", () => {
    expect(
      matchAction(TEST_KEYMAP, undefined, { key: "s", ctrlKey: true }),
    ).toBe("save");
  });

  it("does not match when required modifier is missing", () => {
    expect(matchAction(TEST_KEYMAP, undefined, { key: "s" })).toBeNull();
  });

  it("does not match when extra modifier is present", () => {
    expect(
      matchAction(TEST_KEYMAP, undefined, {
        key: "s",
        ctrlKey: true,
        shiftKey: true,
      }),
    ).toBeNull();
  });

  it("matches compound modifier combinations", () => {
    expect(
      matchAction(TEST_KEYMAP, undefined, {
        key: "z",
        ctrlKey: true,
        shiftKey: true,
      }),
    ).toBe("redo");
    // Missing one modifier
    expect(
      matchAction(TEST_KEYMAP, undefined, { key: "z", ctrlKey: true }),
    ).toBeNull();
  });

  it("supports modifier overrides", () => {
    const overrides = { save: ["Meta+s"] as string[] };
    expect(
      matchAction(TEST_KEYMAP, overrides, { key: "s", metaKey: true }),
    ).toBe("save");
    // Original Ctrl+s no longer works
    expect(
      matchAction(TEST_KEYMAP, overrides, { key: "s", ctrlKey: true }),
    ).toBeNull();
  });
});

describe("listBindings", () => {
  it("returns all bindings from the keymap", () => {
    const bindings = listBindings(TEST_KEYMAP);
    expect(bindings).toHaveLength(5);
    expect(bindings[0]).toEqual({
      action: "moveUp",
      keys: ["ArrowUp", "k"],
      description: "Move up",
    });
    expect(bindings[1]).toEqual({
      action: "moveDown",
      keys: ["ArrowDown", "j"],
      description: "Move down",
    });
    expect(bindings[2]).toEqual({
      action: "confirm",
      keys: ["Enter"],
      description: "Select",
    });
  });

  it("applies overrides to listed bindings", () => {
    const overrides = { moveUp: ["w", "ArrowUp"] as string[] };
    const bindings = listBindings(TEST_KEYMAP, overrides);
    const moveUp = bindings.find((b) => b.action === "moveUp");
    expect(moveUp).toEqual({
      action: "moveUp",
      keys: ["w", "ArrowUp"],
      description: "Move up",
    });
  });

  it("excludes disabled actions", () => {
    const overrides = { confirm: null, save: null };
    const bindings = listBindings(TEST_KEYMAP, overrides);
    expect(bindings).toHaveLength(3);
    expect(bindings.find((b) => b.action === "confirm")).toBeUndefined();
    expect(bindings.find((b) => b.action === "save")).toBeUndefined();
  });

  it("preserves description from keymap even with overrides", () => {
    const overrides = { moveDown: ["s"] as string[] };
    const bindings = listBindings(TEST_KEYMAP, overrides);
    const moveDown = bindings.find((b) => b.action === "moveDown");
    expect(moveDown?.description).toBe("Move down");
  });
});

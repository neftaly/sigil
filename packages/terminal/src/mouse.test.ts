import { describe, expect, it, vi } from "vitest";

import { createOverlayState, setOverlay } from "@charui/core";

import { parseSGRMouse, syncSelectionToTerminal } from "./mouse.ts";

describe("parseSGRMouse", () => {
  it("parses pointerdown (left button)", () => {
    const result = parseSGRMouse("\x1b[<0;5;3M");
    expect(result).toEqual({ type: "pointerdown", col: 4, row: 2, button: 0 });
  });

  it("parses pointerup (release)", () => {
    const result = parseSGRMouse("\x1b[<0;5;3m");
    expect(result).toEqual({ type: "pointerup", col: 4, row: 2, button: 0 });
  });

  it("parses pointermove (motion)", () => {
    // Button code 32 = motion flag
    const result = parseSGRMouse("\x1b[<32;10;20M");
    expect(result).toEqual({ type: "pointermove", col: 9, row: 19, button: 0 });
  });

  it("parses right button click", () => {
    const result = parseSGRMouse("\x1b[<2;1;1M");
    expect(result).toEqual({ type: "pointerdown", col: 0, row: 0, button: 2 });
  });

  it("parses middle button click", () => {
    const result = parseSGRMouse("\x1b[<1;1;1M");
    expect(result).toEqual({ type: "pointerdown", col: 0, row: 0, button: 1 });
  });

  it("parses motion with button held", () => {
    // 32 (motion) + 0 (left button) = 32
    const result = parseSGRMouse("\x1b[<32;5;5M");
    expect(result).toEqual({ type: "pointermove", col: 4, row: 4, button: 0 });
  });

  it("converts 1-based to 0-based coordinates", () => {
    const result = parseSGRMouse("\x1b[<0;1;1M");
    expect(result).toEqual({ type: "pointerdown", col: 0, row: 0, button: 0 });
  });

  it("returns null for non-SGR data", () => {
    expect(parseSGRMouse("hello")).toBeNull();
    expect(parseSGRMouse("")).toBeNull();
    expect(parseSGRMouse("\x1b[A")).toBeNull();
  });
});

describe("syncSelectionToTerminal", () => {
  function mockTerm() {
    return { select: vi.fn(), clearSelection: vi.fn() };
  }

  it("clears selection when overlayState is null", () => {
    const term = mockTerm();
    syncSelectionToTerminal(term, null);
    expect(term.clearSelection).toHaveBeenCalled();
  });

  it("clears selection when no selection overlay exists", () => {
    const term = mockTerm();
    const state = createOverlayState();
    syncSelectionToTerminal(term, state);
    expect(term.clearSelection).toHaveBeenCalled();
  });

  it("clears selection for collapsed (cursor-only) overlay", () => {
    const term = mockTerm();
    const state = createOverlayState();
    setOverlay(state, {
      id: "selection-node1",
      priority: 100,
      ranges: [{ startRow: 0, startCol: 5, endRow: 0, endCol: 5 }],
      transform: { type: "invert" },
    });
    syncSelectionToTerminal(term, state);
    expect(term.clearSelection).toHaveBeenCalled();
  });

  it("selects range for non-collapsed overlay", () => {
    const term = mockTerm();
    const state = createOverlayState();
    setOverlay(state, {
      id: "selection-node1",
      priority: 100,
      ranges: [{ startRow: 2, startCol: 3, endRow: 2, endCol: 7 }],
      transform: { type: "invert" },
    });
    syncSelectionToTerminal(term, state);
    expect(term.select).toHaveBeenCalledWith(3, 2, 5);
  });

  it("ignores non-selection overlays", () => {
    const term = mockTerm();
    const state = createOverlayState();
    setOverlay(state, {
      id: "cursor-highlight",
      priority: 50,
      ranges: [{ startRow: 0, startCol: 0, endRow: 0, endCol: 5 }],
      transform: { type: "invert" },
    });
    syncSelectionToTerminal(term, state);
    expect(term.clearSelection).toHaveBeenCalled();
    expect(term.select).not.toHaveBeenCalled();
  });
});

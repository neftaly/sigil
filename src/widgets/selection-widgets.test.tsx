import React from "react";
import { describe, expect, it } from "vitest";
import { createElement } from "react";

import { createRoot } from "../react/render.ts";
import { RadioGroup } from "./RadioGroup.tsx";
import { NumberInput } from "./NumberInput.tsx";
import { Slider } from "./Slider.tsx";
import { ListBox } from "./ListBox.tsx";
import { CheckList } from "./CheckList.tsx";
import { TabBar } from "./TabBar.tsx";

// --- RadioGroup ---

describe("RadioGroup", () => {
  it("renders radio options with labels", () => {
    const root = createRoot(30, 5);
    root.render(
      createElement(RadioGroup, {
        value: "b",
        options: [
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
          { value: "c", label: "Gamma" },
        ],
      }),
    );
    const str = root.toString();
    expect(str).toContain("Alpha");
    expect(str).toContain("Beta");
    expect(str).toContain("Gamma");
    root.unmount();
  });

  it("shows selected indicator for the active value", () => {
    const root = createRoot(30, 4);
    root.render(
      createElement(RadioGroup, {
        value: "b",
        options: [
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ],
      }),
    );
    const str = root.toString();
    // Selected item should have the filled circle
    expect(str).toContain("(\u25CF) Beta");
    // Unselected item should have empty parens
    expect(str).toContain("( ) Alpha");
    root.unmount();
  });

  it("renders dimmed when disabled", () => {
    const root = createRoot(30, 4);
    root.render(
      createElement(RadioGroup, {
        value: "a",
        options: [
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ],
        disabled: true,
      }),
    );
    const str = root.toString();
    expect(str).toContain("Alpha");
    expect(str).toContain("Beta");
    root.unmount();
  });
});

// --- NumberInput ---

describe("NumberInput", () => {
  it("renders the current value with arrows", () => {
    const root = createRoot(30, 1);
    root.render(
      createElement(NumberInput, {
        value: 42,
      }),
    );
    const str = root.toString();
    expect(str).toContain("42");
    expect(str).toContain("\u25C0"); // left arrow
    expect(str).toContain("\u25B6"); // right arrow
    root.unmount();
  });

  it("renders with a label", () => {
    const root = createRoot(30, 1);
    root.render(
      createElement(NumberInput, {
        value: 5,
        label: "Count",
      }),
    );
    const str = root.toString();
    expect(str).toContain("5");
    expect(str).toContain("Count");
    root.unmount();
  });

  it("renders when disabled", () => {
    const root = createRoot(30, 1);
    root.render(
      createElement(NumberInput, {
        value: 10,
        min: 0,
        max: 20,
        disabled: true,
      }),
    );
    const str = root.toString();
    expect(str).toContain("10");
    root.unmount();
  });
});

// --- Slider ---

describe("Slider", () => {
  it("renders a slider bar with fill and empty", () => {
    const root = createRoot(22, 1);
    root.render(
      createElement(Slider, {
        value: 50,
        min: 0,
        max: 100,
        width: 22,
      }),
    );
    const str = root.toString();
    // Should contain end caps
    expect(str).toContain("\u251C"); // left cap unfocused
    expect(str).toContain("\u2524"); // right cap unfocused
    // Should contain filled blocks and empty blocks
    expect(str).toContain("\u2588"); // filled
    expect(str).toContain("\u2591"); // empty
    root.unmount();
  });

  it("renders at min value (all empty)", () => {
    const root = createRoot(22, 1);
    root.render(
      createElement(Slider, {
        value: 0,
        min: 0,
        max: 100,
        width: 22,
      }),
    );
    const str = root.toString();
    // At min, all bar content should be empty blocks
    expect(str).toContain("\u2591");
    root.unmount();
  });

  it("shows label when showLabel is true", () => {
    const root = createRoot(30, 1);
    root.render(
      createElement(Slider, {
        value: 75,
        min: 0,
        max: 100,
        width: 22,
        showLabel: true,
      }),
    );
    const str = root.toString();
    expect(str).toContain("75");
    root.unmount();
  });
});

// --- ListBox ---

describe("ListBox", () => {
  it("renders options in a bordered list", () => {
    const root = createRoot(20, 8);
    root.render(
      createElement(ListBox, {
        value: "b",
        options: [
          { value: "a", label: "Apple" },
          { value: "b", label: "Banana" },
          { value: "c", label: "Cherry" },
        ],
        height: 4,
      }),
    );
    const str = root.toString();
    expect(str).toContain("Apple");
    expect(str).toContain("Banana");
    expect(str).toContain("Cherry");
    root.unmount();
  });

  it("shows selected item with indicator", () => {
    const root = createRoot(20, 8);
    root.render(
      createElement(ListBox, {
        value: "b",
        options: [
          { value: "a", label: "Apple" },
          { value: "b", label: "Banana" },
        ],
        height: 4,
      }),
    );
    const str = root.toString();
    expect(str).toContain("\u25B8 Banana");
    root.unmount();
  });

  it("renders when disabled", () => {
    const root = createRoot(20, 8);
    root.render(
      createElement(ListBox, {
        value: "a",
        options: [
          { value: "a", label: "Apple" },
          { value: "b", label: "Banana" },
        ],
        height: 4,
        disabled: true,
      }),
    );
    const str = root.toString();
    expect(str).toContain("Apple");
    root.unmount();
  });
});

// --- CheckList ---

describe("CheckList", () => {
  it("renders options with checkboxes", () => {
    const root = createRoot(25, 8);
    root.render(
      createElement(CheckList, {
        value: ["b"],
        options: [
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
          { value: "c", label: "Gamma" },
        ],
        height: 4,
      }),
    );
    const str = root.toString();
    expect(str).toContain("Alpha");
    expect(str).toContain("Beta");
    expect(str).toContain("Gamma");
    root.unmount();
  });

  it("shows checked items with [x] indicator", () => {
    const root = createRoot(25, 8);
    root.render(
      createElement(CheckList, {
        value: ["b"],
        options: [
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ],
        height: 4,
      }),
    );
    const str = root.toString();
    expect(str).toContain("[x] Beta");
    expect(str).toContain("[ ] Alpha");
    root.unmount();
  });

  it("renders empty value as all unchecked", () => {
    const root = createRoot(25, 8);
    root.render(
      createElement(CheckList, {
        value: [],
        options: [
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ],
        height: 4,
      }),
    );
    const str = root.toString();
    expect(str).toContain("[ ] Alpha");
    expect(str).toContain("[ ] Beta");
    root.unmount();
  });
});

// --- TabBar ---

describe("TabBar", () => {
  it("renders tab labels", () => {
    const root = createRoot(40, 1);
    root.render(
      createElement(TabBar, {
        value: "tab1",
        tabs: [
          { value: "tab1", label: "Home" },
          { value: "tab2", label: "Settings" },
          { value: "tab3", label: "About" },
        ],
      }),
    );
    const str = root.toString();
    expect(str).toContain("Home");
    expect(str).toContain("Settings");
    expect(str).toContain("About");
    root.unmount();
  });

  it("shows active tab with different brackets", () => {
    const root = createRoot(40, 1);
    root.render(
      createElement(TabBar, {
        value: "tab2",
        tabs: [
          { value: "tab1", label: "Home" },
          { value: "tab2", label: "Settings" },
        ],
      }),
    );
    const str = root.toString();
    // Active tab uses top-left corner bracket
    expect(str).toContain("\u250C");
    // Inactive tab uses vertical bar
    expect(str).toContain("\u2502");
    root.unmount();
  });

  it("renders with disabled tabs", () => {
    const root = createRoot(40, 1);
    root.render(
      createElement(TabBar, {
        value: "tab1",
        tabs: [
          { value: "tab1", label: "Home" },
          { value: "tab2", label: "Settings", disabled: true },
        ],
      }),
    );
    const str = root.toString();
    expect(str).toContain("Home");
    expect(str).toContain("Settings");
    root.unmount();
  });
});

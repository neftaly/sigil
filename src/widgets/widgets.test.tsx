import React from "react";
import { describe, expect, it, vi } from "vitest";

import { createRoot } from "../react/render.ts";
import { Box, Text } from "../react/primitives.tsx";

import { Button } from "./Button.tsx";
import { CheckBox } from "./CheckBox.tsx";
import { Toggle } from "./Toggle.tsx";
import { Panel } from "./Panel.tsx";
import { Divider } from "./Divider.tsx";
import { ProgressBar } from "./ProgressBar.tsx";
import { Spinner } from "./Spinner.tsx";

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
describe("Button", () => {
  it("renders button label with border", () => {
    const root = createRoot(20, 3);
    root.render(<Button label="Click" />);
    const str = root.toString();
    expect(str).toContain("Click");
    // Should have border characters
    expect(str).toContain("\u2502"); // single vertical border
    root.unmount();
  });

  it("renders disabled button with italic text", () => {
    const root = createRoot(20, 3);
    root.render(<Button label="Nope" disabled />);
    const str = root.toString();
    expect(str).toContain("Nope");

    // Check that the text node has italic style
    const nodes = Array.from(root.database.nodes.values());
    const textNode = nodes.find(
      (n) => n.type === "text" && n.props.italic === true,
    );
    expect(textNode).toBeDefined();
    root.unmount();
  });

  it("is not focusable when disabled", () => {
    const root = createRoot(20, 3);
    root.render(<Button label="Disabled" disabled />);
    const nodes = Array.from(root.database.nodes.values());
    const focusableNodes = nodes.filter((n) => n.props.focusable === true);
    expect(focusableNodes).toHaveLength(0);
    root.unmount();
  });

  it("is focusable when not disabled", () => {
    const root = createRoot(20, 3);
    root.render(<Button label="Active" />);
    const nodes = Array.from(root.database.nodes.values());
    const focusableNodes = nodes.filter((n) => n.props.focusable === true);
    expect(focusableNodes).toHaveLength(1);
    root.unmount();
  });
});

// ---------------------------------------------------------------------------
// CheckBox
// ---------------------------------------------------------------------------
describe("CheckBox", () => {
  it("renders unchecked state", () => {
    const root = createRoot(20, 1);
    root.render(<CheckBox checked={false} label="Option" />);
    const str = root.toString();
    expect(str).toContain("[ ]");
    expect(str).toContain("Option");
    root.unmount();
  });

  it("renders checked state", () => {
    const root = createRoot(20, 1);
    root.render(<CheckBox checked label="Option" />);
    const str = root.toString();
    expect(str).toContain("[x]");
    root.unmount();
  });

  it("renders indeterminate state", () => {
    const root = createRoot(20, 1);
    root.render(<CheckBox checked={false} indeterminate label="Mixed" />);
    const str = root.toString();
    expect(str).toContain("[~]");
    root.unmount();
  });

  it("renders disabled state", () => {
    const root = createRoot(20, 1);
    root.render(<CheckBox checked={false} disabled label="Disabled" />);
    const str = root.toString();
    expect(str).toContain("[-]");
    root.unmount();
  });

  it("is not focusable when disabled", () => {
    const root = createRoot(20, 1);
    root.render(<CheckBox checked={false} disabled />);
    const nodes = Array.from(root.database.nodes.values());
    const focusableNodes = nodes.filter((n) => n.props.focusable === true);
    expect(focusableNodes).toHaveLength(0);
    root.unmount();
  });
});

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------
describe("Toggle", () => {
  it("renders unchecked track", () => {
    const root = createRoot(20, 1);
    root.render(<Toggle checked={false} />);
    const str = root.toString();
    // Unchecked: ━━○
    expect(str).toContain("\u2501\u2501\u25CB");
    root.unmount();
  });

  it("renders checked track", () => {
    const root = createRoot(20, 1);
    root.render(<Toggle checked />);
    const str = root.toString();
    // Checked: ●━━
    expect(str).toContain("\u25CF\u2501\u2501");
    root.unmount();
  });

  it("renders with label", () => {
    const root = createRoot(30, 1);
    root.render(<Toggle checked={false} label="Dark mode" />);
    const str = root.toString();
    expect(str).toContain("Dark mode");
    root.unmount();
  });
});

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------
describe("Panel", () => {
  it("renders with border and title", () => {
    const root = createRoot(20, 5);
    root.render(
      <Panel title="Settings" width={20}>
        <Text>Content</Text>
      </Panel>,
    );
    const str = root.toString();
    expect(str).toContain("Settings");
    expect(str).toContain("Content");
    // Should have border
    expect(str).toContain("\u250C"); // top-left corner (single)
    root.unmount();
  });

  it("renders without title", () => {
    const root = createRoot(20, 4);
    root.render(
      <Panel width={20}>
        <Text>Just content</Text>
      </Panel>,
    );
    const str = root.toString();
    expect(str).toContain("Just content");
    root.unmount();
  });

  it("is not focusable", () => {
    const root = createRoot(20, 5);
    root.render(<Panel title="Test" width={20} />);
    const nodes = Array.from(root.database.nodes.values());
    const focusableNodes = nodes.filter((n) => n.props.focusable === true);
    expect(focusableNodes).toHaveLength(0);
    root.unmount();
  });
});

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------
describe("Divider", () => {
  it("renders horizontal divider", () => {
    const root = createRoot(10, 1);
    root.render(<Box width={10} height={1}><Divider /></Box>);
    const str = root.toString();
    // Should contain horizontal line characters
    expect(str).toContain("\u2500");
    root.unmount();
  });

  it("renders vertical divider", () => {
    const root = createRoot(3, 3);
    root.render(<Box width={3} height={3}><Divider direction="vertical" /></Box>);
    const str = root.toString();
    expect(str).toContain("\u2502");
    root.unmount();
  });
});

// ---------------------------------------------------------------------------
// ProgressBar
// ---------------------------------------------------------------------------
describe("ProgressBar", () => {
  it("renders full bar at value=1", () => {
    const root = createRoot(20, 1);
    root.render(<ProgressBar value={1} width={10} />);
    const str = root.toString();
    // All filled
    expect(str).toContain("\u2588".repeat(10));
    root.unmount();
  });

  it("renders empty bar at value=0", () => {
    const root = createRoot(20, 1);
    root.render(<ProgressBar value={0} width={10} />);
    const str = root.toString();
    // All empty
    expect(str).toContain("\u2591".repeat(10));
    root.unmount();
  });

  it("renders partial bar at value=0.5", () => {
    const root = createRoot(20, 1);
    root.render(<ProgressBar value={0.5} width={10} />);
    const str = root.toString();
    expect(str).toContain("\u2588".repeat(5));
    expect(str).toContain("\u2591".repeat(5));
    root.unmount();
  });

  it("clamps value to 0-1 range", () => {
    const root = createRoot(20, 1);
    root.render(<ProgressBar value={2} width={10} />);
    const str = root.toString();
    expect(str).toContain("\u2588".repeat(10));
    root.unmount();
  });
});

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------
describe("Spinner", () => {
  it("renders first frame", () => {
    const root = createRoot(20, 1);
    root.render(<Spinner />);
    const str = root.toString();
    // First default frame is ⠋
    expect(str).toContain("\u280B");
    root.unmount();
  });

  it("renders with label", () => {
    const root = createRoot(30, 1);
    root.render(<Spinner label="Loading..." />);
    const str = root.toString();
    expect(str).toContain("Loading...");
    root.unmount();
  });

  it("renders custom frames", () => {
    const root = createRoot(20, 1);
    root.render(<Spinner frames={["-", "\\", "|", "/"]} />);
    const str = root.toString();
    // Should render first custom frame
    expect(str).toContain("-");
    root.unmount();
  });
});

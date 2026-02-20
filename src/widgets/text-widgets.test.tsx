import React from "react";
import { describe, expect, it } from "vitest";

import { createRoot } from "../react/render.ts";

import { TextField } from "./TextField.tsx";
import { Dialog } from "./Dialog.tsx";
import { TextArea } from "./TextArea.tsx";

describe("TextField", () => {
  it("renders text field with value", () => {
    const root = createRoot(20, 3);
    root.render(<TextField value="hello" width={15} />);
    const str = root.toString();
    expect(str).toContain("hello");
    root.unmount();
  });

  it("renders placeholder when value is empty", () => {
    const root = createRoot(20, 3);
    root.render(
      <TextField value="" placeholder="Type here..." width={18} />,
    );
    const str = root.toString();
    expect(str).toContain("Type here...");
    root.unmount();
  });

  it("renders password mode with bullet characters", () => {
    const root = createRoot(20, 3);
    root.render(
      <TextField value="secret" width={15} echoMode="password" />,
    );
    const str = root.toString();
    // Should contain bullets, not the actual text.
    expect(str).toContain("\u2022");
    expect(str).not.toContain("secret");
    root.unmount();
  });
});

describe("Dialog", () => {
  it("renders dialog with title", () => {
    const root = createRoot(30, 10);
    root.render(<Dialog title="Confirm" />);
    const str = root.toString();
    expect(str).toContain("Confirm");
    root.unmount();
  });

  it("renders dialog with children", () => {
    const root = createRoot(40, 10);
    root.render(
      <Dialog title="Alert">
        <React.Fragment>Are you sure?</React.Fragment>
      </Dialog>,
    );
    const str = root.toString();
    expect(str).toContain("Alert");
    root.unmount();
  });

  it("renders dialog without title", () => {
    const root = createRoot(30, 10);
    root.render(<Dialog />);
    // Should render without error (just a bordered box).
    const str = root.toString();
    // Verify it has a border character (round style from focused border).
    expect(str).toContain("\u256D");
    root.unmount();
  });
});

describe("TextArea", () => {
  it("renders text area with value", () => {
    const root = createRoot(25, 7);
    root.render(<TextArea value="Hello\nWorld" width={20} height={5} />);
    const str = root.toString();
    expect(str).toContain("Hello");
    expect(str).toContain("World");
    root.unmount();
  });

  it("renders placeholder when value is empty", () => {
    const root = createRoot(25, 7);
    root.render(
      <TextArea
        value=""
        placeholder="Enter text..."
        width={20}
        height={5}
      />,
    );
    const str = root.toString();
    expect(str).toContain("Enter text...");
    root.unmount();
  });

  it("renders multi-line content correctly", () => {
    const root = createRoot(25, 8);
    root.render(
      <TextArea value={"Line 1\nLine 2\nLine 3"} width={20} height={6} />,
    );
    const str = root.toString();
    expect(str).toContain("Line 1");
    expect(str).toContain("Line 2");
    expect(str).toContain("Line 3");
    root.unmount();
  });
});

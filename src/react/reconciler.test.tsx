import React from "react";
import { describe, expect, it } from "vitest";

import { type TextNodeProps, gridToString } from "../core/index.ts";

import { createRoot } from "./render.ts";
import { Box, Text } from "./primitives.tsx";

describe("React reconciler", () => {
  it("renders a box with border via JSX", () => {
    const root = createRoot(10, 3);
    root.render(
      <Box border width={10} height={3}>
        <Text>Hello</Text>
      </Box>,
    );

    expect(root.toString()).toBe(
      ["┌────────┐", "│Hello   │", "└────────┘"].join("\n"),
    );
  });

  it("renders text that self-sizes via measureFunc", () => {
    const root = createRoot(20, 3);
    root.render(
      <Box border width={20} height={3}>
        <Text>Auto</Text>
      </Box>,
    );

    // Text should measure itself — "Auto" is 4 chars wide
    const grid = root.getGrid();
    const str = gridToString(grid);
    expect(str).toContain("Auto");
  });

  it("renders flex row with correct bounds", () => {
    const root = createRoot(20, 1);
    root.render(
      <Box flexDirection="row" width={20} height={1}>
        <Box width={10} height={1} />
        <Box width={10} height={1} />
      </Box>,
    );

    // Check bounds via database
    const { database } = root;
    const nodes = Array.from(database.nodes.values());
    const children = nodes.filter((n) => n.parentId !== null);
    expect(children).toHaveLength(2);

    // First child at x=0, second at x=10
    expect(children[0].bounds).toEqual({ x: 0, y: 0, width: 10, height: 1 });
    expect(children[1].bounds).toEqual({ x: 10, y: 0, width: 10, height: 1 });
  });

  it("re-renders with changed props", () => {
    const root = createRoot(10, 3);

    root.render(
      <Box border width={10} height={3}>
        <Text>Hello</Text>
      </Box>,
    );
    expect(root.toString()).toContain("Hello");

    root.render(
      <Box border width={10} height={3}>
        <Text>World</Text>
      </Box>,
    );
    expect(root.toString()).toContain("World");
    expect(root.toString()).not.toContain("Hello");
  });

  it("conditional render: toggle node", () => {
    const root = createRoot(12, 3);

    function App({ show }: { show: boolean }) {
      return (
        <Box border width={12} height={3}>
          {show && <Text>Visible</Text>}
        </Box>
      );
    }

    root.render(<App show />);
    expect(root.toString()).toContain("Visible");

    root.render(<App show={false} />);
    expect(root.toString()).not.toContain("Visible");

    // Yoga node should be freed — only root box + container remain
    const nodeCount = root.database.nodes.size;
    // Root box = 1 node (Text was removed)
    expect(nodeCount).toBe(1);
  });

  it("key-based reorder swaps children", () => {
    const root = createRoot(20, 1);

    function App({ order }: { order: string[] }) {
      return (
        <Box flexDirection="row" width={20} height={1}>
          {order.map((label) => (
            <Box key={label} width={5} height={1}>
              <Text>{label}</Text>
            </Box>
          ))}
        </Box>
      );
    }

    root.render(<App order={["A", "B"]} />);
    let str = root.toString();
    const aIndex1 = str.indexOf("A");
    const bIndex1 = str.indexOf("B");
    expect(aIndex1).toBeLessThan(bIndex1);

    root.render(<App order={["B", "A"]} />);
    str = root.toString();
    const bIndex2 = str.indexOf("B");
    const aIndex2 = str.indexOf("A");
    expect(bIndex2).toBeLessThan(aIndex2);
  });

  it("deep nesting: 3+ levels of boxes with bounds", () => {
    const root = createRoot(20, 7);
    root.render(
      <Box border width={20} height={7}>
        <Box border width={16} height={5}>
          <Box border width={12} height={3}>
            <Text>Deep</Text>
          </Box>
        </Box>
      </Box>,
    );

    const str = root.toString();
    expect(str).toContain("Deep");

    // Verify nested bounds propagate correctly
    const nodes = Array.from(root.database.nodes.values());
    const textNode = nodes.find(
      (n) => n.type === "text" && (n.props as TextNodeProps).content === "Deep",
    );
    expect(textNode).toBeDefined();
    expect(textNode!.bounds).toBeDefined();
    // Text should be inside all three borders: x >= 3, y >= 3
    expect(textNode!.bounds!.x).toBeGreaterThanOrEqual(3);
    expect(textNode!.bounds!.y).toBeGreaterThanOrEqual(3);
  });

  it("unmount cleans up all nodes", () => {
    const root = createRoot(10, 3);
    root.render(
      <Box border width={10} height={3}>
        <Text>Hello</Text>
      </Box>,
    );
    expect(root.database.nodes.size).toBeGreaterThan(0);

    root.unmount();
    expect(root.database.nodes.size).toBe(0);
  });

  it("text wrapping works via JSX", () => {
    const root = createRoot(10, 4);
    root.render(
      <Box border width={10} height={4}>
        <Text wrap>Hello World</Text>
      </Box>,
    );

    const str = root.toString();
    expect(str).toBe(
      ["┌────────┐", "│Hello   │", "│World   │", "└────────┘"].join("\n"),
    );
  });
});

import { describe, expect, it } from "vitest";

import { gridToString } from "./cell.ts";
import {
  addNode,
  computeLayout,
  createDatabase,
  removeNode,
} from "./database.ts";
import { rasterize } from "./rasterize.ts";

describe("rasterize", () => {
  it("renders a box with a single border", () => {
    const database = createDatabase();

    const root = addNode(database, {
      id: "root",
      type: "box",
      props: { border: true },
      parentId: null,
    });
    root.yogaNode.setWidth(10);
    root.yogaNode.setHeight(3);
    root.yogaNode.setBorder(database.yoga.EDGE_ALL, 1);

    computeLayout(database, 10, 3);
    const grid = rasterize(database, 10, 3);

    expect(gridToString(grid)).toBe(
      ["┌────────┐", "│        │", "└────────┘"].join("\n"),
    );
  });

  it("renders text inside a bordered box", () => {
    const database = createDatabase();

    const root = addNode(database, {
      id: "root",
      type: "box",
      props: { border: true },
      parentId: null,
    });
    root.yogaNode.setWidth(10);
    root.yogaNode.setHeight(3);
    root.yogaNode.setBorder(database.yoga.EDGE_ALL, 1);

    const text = addNode(database, {
      id: "text",
      type: "text",
      props: { content: "Hello" },
      parentId: "root",
    });
    text.yogaNode.setHeight(1);

    computeLayout(database, 10, 3);
    const grid = rasterize(database, 10, 3);

    expect(gridToString(grid)).toBe(
      ["┌────────┐", "│Hello   │", "└────────┘"].join("\n"),
    );
  });

  it("renders nested bordered boxes", () => {
    const database = createDatabase();

    const root = addNode(database, {
      id: "root",
      type: "box",
      props: { border: true },
      parentId: null,
    });
    root.yogaNode.setWidth(14);
    root.yogaNode.setHeight(5);
    root.yogaNode.setBorder(database.yoga.EDGE_ALL, 1);

    const inner = addNode(database, {
      id: "inner",
      type: "box",
      props: { border: true },
      parentId: "root",
    });
    inner.yogaNode.setWidth(10);
    inner.yogaNode.setHeight(3);
    inner.yogaNode.setBorder(database.yoga.EDGE_ALL, 1);

    const text = addNode(database, {
      id: "text",
      type: "text",
      props: { content: "Hi" },
      parentId: "inner",
    });
    text.yogaNode.setHeight(1);

    computeLayout(database, 14, 5);
    const grid = rasterize(database, 14, 5);

    expect(gridToString(grid)).toBe(
      [
        "┌────────────┐",
        "│┌────────┐  │",
        "││Hi      │  │",
        "│└────────┘  │",
        "└────────────┘",
      ].join("\n"),
    );
  });

  it("renders CJK text with correct width", () => {
    const database = createDatabase();

    const root = addNode(database, {
      id: "root",
      type: "box",
      props: { border: true },
      parentId: null,
    });
    root.yogaNode.setWidth(10);
    root.yogaNode.setHeight(3);
    root.yogaNode.setBorder(database.yoga.EDGE_ALL, 1);

    const text = addNode(database, {
      id: "text",
      type: "text",
      props: { content: "你好" },
      parentId: "root",
    });
    text.yogaNode.setHeight(1);

    computeLayout(database, 10, 3);
    const grid = rasterize(database, 10, 3);

    expect(gridToString(grid)).toBe(
      ["┌────────┐", "│你好    │", "└────────┘"].join("\n"),
    );
  });

  it("wraps text at word boundaries", () => {
    const database = createDatabase();

    const root = addNode(database, {
      id: "root",
      type: "box",
      props: { border: true },
      parentId: null,
    });
    root.yogaNode.setWidth(10);
    root.yogaNode.setHeight(4);
    root.yogaNode.setBorder(database.yoga.EDGE_ALL, 1);

    const text = addNode(database, {
      id: "text",
      type: "text",
      props: { content: "Hello World", wrap: true },
      parentId: "root",
    });
    text.yogaNode.setHeight(2);

    computeLayout(database, 10, 4);
    const grid = rasterize(database, 10, 4);

    expect(gridToString(grid)).toBe(
      ["┌────────┐", "│Hello   │", "│World   │", "└────────┘"].join("\n"),
    );
  });

  it("clips text that exceeds bounds", () => {
    const database = createDatabase();

    const root = addNode(database, {
      id: "root",
      type: "box",
      props: {},
      parentId: null,
    });
    root.yogaNode.setWidth(5);
    root.yogaNode.setHeight(1);

    const text = addNode(database, {
      id: "text",
      type: "text",
      props: { content: "Hello World" },
      parentId: "root",
    });
    text.yogaNode.setHeight(1);

    computeLayout(database, 5, 1);
    const grid = rasterize(database, 5, 1);

    expect(gridToString(grid)).toBe("Hello");
  });

  it("handles reflow at different widths", () => {
    const database = createDatabase();

    const root = addNode(database, {
      id: "root",
      type: "box",
      props: { border: true },
      parentId: null,
    });
    root.yogaNode.setBorder(database.yoga.EDGE_ALL, 1);

    const text = addNode(database, {
      id: "text",
      type: "text",
      props: { content: "Hi" },
      parentId: "root",
    });
    text.yogaNode.setHeight(1);

    // Render at width 8
    root.yogaNode.setWidth(8);
    root.yogaNode.setHeight(3);
    computeLayout(database, 8, 3);
    const grid8 = rasterize(database, 8, 3);
    expect(gridToString(grid8)).toBe(
      ["┌──────┐", "│Hi    │", "└──────┘"].join("\n"),
    );

    // Reflow at width 6
    root.yogaNode.setWidth(6);
    computeLayout(database, 6, 3);
    const grid6 = rasterize(database, 6, 3);
    expect(gridToString(grid6)).toBe(["┌────┐", "│Hi  │", "└────┘"].join("\n"));
  });

  it("renders empty text as nothing", () => {
    const database = createDatabase();

    const root = addNode(database, {
      id: "root",
      type: "box",
      props: {},
      parentId: null,
    });
    root.yogaNode.setWidth(5);
    root.yogaNode.setHeight(1);

    addNode(database, {
      id: "text",
      type: "text",
      props: { content: "" },
      parentId: "root",
    });

    computeLayout(database, 5, 1);
    const grid = rasterize(database, 5, 1);

    expect(gridToString(grid)).toBe("     ");
  });

  it("add then remove node does not crash", () => {
    const database = createDatabase();

    addNode(database, { id: "root", type: "box", props: {}, parentId: null });
    addNode(database, {
      id: "child",
      type: "text",
      props: {},
      parentId: "root",
    });

    removeNode(database, "child");

    database.nodes.get("root")!.yogaNode.setWidth(5);
    database.nodes.get("root")!.yogaNode.setHeight(1);
    computeLayout(database, 5, 1);
    const grid = rasterize(database, 5, 1);
    expect(gridToString(grid)).toBe("     ");
  });
});

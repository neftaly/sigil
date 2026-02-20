import { describe, expect, it } from "vitest";

import { gridToString } from "./cell.ts";
import {
  addNode,
  computeLayout,
  createDatabase,
  removeNode,
} from "./database.ts";
import { applyYogaStyles } from "./yoga-styles.ts";
import { rasterize, rasterizeOne } from "./rasterize.ts";

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

describe("rasterizeOne", () => {
  it("renders a single bordered box", () => {
    const database = createDatabase();

    const root = addNode(database, {
      id: "root",
      type: "box",
      props: { border: true },
      parentId: null,
    });
    root.yogaNode.setWidth(8);
    root.yogaNode.setHeight(3);
    root.yogaNode.setBorder(database.yoga.EDGE_ALL, 1);

    computeLayout(database, 8, 3);
    const grid = rasterizeOne(database, "root");

    expect(grid).not.toBeNull();
    expect(gridToString(grid!)).toBe(
      ["┌──────┐", "│      │", "└──────┘"].join("\n"),
    );
  });

  it("renders text node content", () => {
    const database = createDatabase();

    const root = addNode(database, {
      id: "root",
      type: "box",
      props: {},
      parentId: null,
    });
    root.yogaNode.setWidth(10);
    root.yogaNode.setHeight(1);

    const text = addNode(database, {
      id: "text",
      type: "text",
      props: { content: "Hello" },
      parentId: "root",
    });
    text.yogaNode.setHeight(1);

    computeLayout(database, 10, 1);
    const grid = rasterizeOne(database, "text");

    expect(grid).not.toBeNull();
    expect(gridToString(grid!)).toBe("Hello     ");
  });

  it("does not include children", () => {
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
      props: { content: "Hi" },
      parentId: "root",
    });
    text.yogaNode.setHeight(1);

    computeLayout(database, 10, 3);
    const grid = rasterizeOne(database, "root");

    // Should only have the border, not the child text
    expect(grid).not.toBeNull();
    expect(gridToString(grid!)).toBe(
      ["┌────────┐", "│        │", "└────────┘"].join("\n"),
    );
  });

  it("returns null for missing node", () => {
    const database = createDatabase();
    const grid = rasterizeOne(database, "nonexistent");
    expect(grid).toBeNull();
  });

  it("returns null for node without bounds", () => {
    const database = createDatabase();

    addNode(database, {
      id: "root",
      type: "box",
      props: {},
      parentId: null,
    });
    // Don't compute layout — bounds are null

    const grid = rasterizeOne(database, "root");
    expect(grid).toBeNull();
  });

  it("grid dimensions match node bounds", () => {
    const database = createDatabase();

    const root = addNode(database, {
      id: "root",
      type: "box",
      props: {},
      parentId: null,
    });
    root.yogaNode.setWidth(7);
    root.yogaNode.setHeight(4);

    computeLayout(database, 7, 4);
    const grid = rasterizeOne(database, "root");

    expect(grid).not.toBeNull();
    expect(grid!.length).toBe(4);
    expect(grid![0].length).toBe(7);
  });
});

describe("scroll support", () => {
  it("scrollY offsets child content", () => {
    const database = createDatabase();

    const root = addNode(database, {
      id: "root",
      type: "box",
      props: {
        border: true,
        overflow: "hidden" as const,
        scrollY: 1,
      },
      parentId: null,
    });
    applyYogaStyles(root, root.props);
    root.yogaNode.setWidth(10);
    root.yogaNode.setHeight(4);
    root.yogaNode.setBorder(database.yoga.EDGE_ALL, 1);

    // Add two lines of text as children
    const t1 = addNode(database, {
      id: "t1",
      type: "text",
      props: { content: "Line1" },
      parentId: "root",
    });
    t1.yogaNode.setHeight(1);

    const t2 = addNode(database, {
      id: "t2",
      type: "text",
      props: { content: "Line2" },
      parentId: "root",
    });
    t2.yogaNode.setHeight(1);

    const t3 = addNode(database, {
      id: "t3",
      type: "text",
      props: { content: "Line3" },
      parentId: "root",
    });
    t3.yogaNode.setHeight(1);

    computeLayout(database, 10, 4);
    const grid = rasterize(database, 10, 4);

    // With scrollY=1 and 2 visible rows inside the border,
    // Line1 is scrolled up out of view, Line2 and Line3 are visible
    const result = gridToString(grid);
    expect(result).toBe(
      ["┌────────┐", "│Line2   │", "│Line3   │", "└────────┘"].join("\n"),
    );
  });

  it("overflow hidden clips children", () => {
    const database = createDatabase();

    const root = addNode(database, {
      id: "root",
      type: "box",
      props: {
        border: true,
        overflow: "hidden" as const,
      },
      parentId: null,
    });
    applyYogaStyles(root, root.props);
    root.yogaNode.setWidth(10);
    root.yogaNode.setHeight(3);
    root.yogaNode.setBorder(database.yoga.EDGE_ALL, 1);

    // Child text that is too long -- should be clipped at the border
    const text = addNode(database, {
      id: "text",
      type: "text",
      props: { content: "Hello World!!" },
      parentId: "root",
    });
    text.yogaNode.setHeight(1);

    computeLayout(database, 10, 3);
    const grid = rasterize(database, 10, 3);

    // Content area is 8 wide (10 - 2 borders), text is clipped
    expect(gridToString(grid)).toBe(
      ["┌────────┐", "│Hello Wo│", "└────────┘"].join("\n"),
    );
  });

  it("scroll indicators appear when overflow is scroll", () => {
    const database = createDatabase();

    const root = addNode(database, {
      id: "root",
      type: "box",
      props: {
        border: true,
        overflow: "scroll" as const,
        scrollY: 1,
      },
      parentId: null,
    });
    applyYogaStyles(root, root.props);
    root.yogaNode.setWidth(10);
    root.yogaNode.setHeight(4);
    root.yogaNode.setBorder(database.yoga.EDGE_ALL, 1);

    // Create 4 lines so there's content above (scrolled past) and below (not visible)
    for (let i = 1; i <= 4; i++) {
      const t = addNode(database, {
        id: `t${i}`,
        type: "text",
        props: { content: `Line${i}` },
        parentId: "root",
      });
      t.yogaNode.setHeight(1);
    }

    computeLayout(database, 10, 4);
    const grid = rasterize(database, 10, 4);

    const result = gridToString(grid);
    // With scrollY=1, visible content area shows Line2 and Line3
    // Up arrow at top-right of content area, down arrow at bottom-right
    expect(result).toBe(
      [
        "┌────────┐",
        "│Line2  \u25B2│",
        "│Line3  \u25BC│",
        "└────────┘",
      ].join("\n"),
    );
  });
});

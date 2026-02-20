import { describe, expect, it } from "vitest";

import { addNode, computeLayout, createDatabase } from "./database.ts";
import { applyYogaStyles } from "./yoga-styles.ts";

describe("applyYogaStyles", () => {
  it("applies width and height", () => {
    const db = createDatabase();
    const node = addNode(db, {
      id: "n",
      type: "box",
      props: {},
      parentId: null,
    });
    applyYogaStyles(node, { width: 10, height: 5 });
    computeLayout(db, 100, 100);
    expect(node.bounds).toEqual({ x: 0, y: 0, width: 10, height: 5 });
  });

  it("applies flexDirection row", () => {
    const db = createDatabase();
    const root = addNode(db, {
      id: "root",
      type: "box",
      props: {},
      parentId: null,
    });
    applyYogaStyles(root, { width: 20, height: 5, flexDirection: "row" });
    const a = addNode(db, {
      id: "a",
      type: "box",
      props: {},
      parentId: "root",
    });
    applyYogaStyles(a, { width: 10, height: 5 });
    const b = addNode(db, {
      id: "b",
      type: "box",
      props: {},
      parentId: "root",
    });
    applyYogaStyles(b, { width: 10, height: 5 });
    computeLayout(db, 20, 5);
    expect(a.bounds!.x).toBe(0);
    expect(b.bounds!.x).toBe(10);
  });

  it("applies flexDirection column", () => {
    const db = createDatabase();
    const root = addNode(db, {
      id: "root",
      type: "box",
      props: {},
      parentId: null,
    });
    applyYogaStyles(root, { width: 10, height: 10, flexDirection: "column" });
    const a = addNode(db, {
      id: "a",
      type: "box",
      props: {},
      parentId: "root",
    });
    applyYogaStyles(a, { width: 10, height: 3 });
    const b = addNode(db, {
      id: "b",
      type: "box",
      props: {},
      parentId: "root",
    });
    applyYogaStyles(b, { width: 10, height: 3 });
    computeLayout(db, 10, 10);
    expect(a.bounds!.y).toBe(0);
    expect(b.bounds!.y).toBe(3);
  });

  it("applies padding", () => {
    const db = createDatabase();
    const root = addNode(db, {
      id: "root",
      type: "box",
      props: {},
      parentId: null,
    });
    applyYogaStyles(root, { width: 20, height: 10, padding: 2 });
    const child = addNode(db, {
      id: "child",
      type: "box",
      props: {},
      parentId: "root",
    });
    applyYogaStyles(child, { width: 5, height: 3 });
    computeLayout(db, 20, 10);
    expect(child.bounds!.x).toBe(2);
    expect(child.bounds!.y).toBe(2);
  });

  it("applies individual padding sides", () => {
    const db = createDatabase();
    const root = addNode(db, {
      id: "root",
      type: "box",
      props: {},
      parentId: null,
    });
    applyYogaStyles(root, {
      width: 20,
      height: 10,
      paddingLeft: 3,
      paddingTop: 1,
    });
    const child = addNode(db, {
      id: "child",
      type: "box",
      props: {},
      parentId: "root",
    });
    applyYogaStyles(child, { width: 5, height: 3 });
    computeLayout(db, 20, 10);
    expect(child.bounds!.x).toBe(3);
    expect(child.bounds!.y).toBe(1);
  });

  it("applies border as 1px on all edges", () => {
    const db = createDatabase();
    const root = addNode(db, {
      id: "root",
      type: "box",
      props: {},
      parentId: null,
    });
    applyYogaStyles(root, { width: 10, height: 5, border: true });
    const child = addNode(db, {
      id: "child",
      type: "box",
      props: {},
      parentId: "root",
    });
    applyYogaStyles(child, { width: 3, height: 1 });
    computeLayout(db, 10, 5);
    expect(child.bounds!.x).toBe(1);
    expect(child.bounds!.y).toBe(1);
  });

  it("applies absolute positioning", () => {
    const db = createDatabase();
    const root = addNode(db, {
      id: "root",
      type: "box",
      props: {},
      parentId: null,
    });
    applyYogaStyles(root, { width: 20, height: 10 });
    const child = addNode(db, {
      id: "child",
      type: "box",
      props: {},
      parentId: "root",
    });
    applyYogaStyles(child, {
      position: "absolute",
      top: 2,
      left: 5,
      width: 4,
      height: 3,
    });
    computeLayout(db, 20, 10);
    expect(child.bounds).toEqual({ x: 5, y: 2, width: 4, height: 3 });
  });

  it("applies alignItems center", () => {
    const db = createDatabase();
    const root = addNode(db, {
      id: "root",
      type: "box",
      props: {},
      parentId: null,
    });
    applyYogaStyles(root, { width: 20, height: 10, alignItems: "center" });
    const child = addNode(db, {
      id: "child",
      type: "box",
      props: {},
      parentId: "root",
    });
    applyYogaStyles(child, { width: 6, height: 3 });
    computeLayout(db, 20, 10);
    // Centered on cross-axis (horizontal for column layout)
    expect(child.bounds!.x).toBe(7);
  });

  it("applies justifyContent center", () => {
    const db = createDatabase();
    const root = addNode(db, {
      id: "root",
      type: "box",
      props: {},
      parentId: null,
    });
    applyYogaStyles(root, { width: 20, height: 10, justifyContent: "center" });
    const child = addNode(db, {
      id: "child",
      type: "box",
      props: {},
      parentId: "root",
    });
    applyYogaStyles(child, { width: 10, height: 3 });
    computeLayout(db, 20, 10);
    // Centered on main axis (vertical for column layout)
    expect(child.bounds!.y).toBe(4);
  });

  it("applies flexGrow", () => {
    const db = createDatabase();
    const root = addNode(db, {
      id: "root",
      type: "box",
      props: {},
      parentId: null,
    });
    applyYogaStyles(root, { width: 20, height: 10, flexDirection: "row" });
    const a = addNode(db, {
      id: "a",
      type: "box",
      props: {},
      parentId: "root",
    });
    applyYogaStyles(a, { flexGrow: 1, height: 5 });
    const b = addNode(db, {
      id: "b",
      type: "box",
      props: {},
      parentId: "root",
    });
    applyYogaStyles(b, { width: 5, height: 5 });
    computeLayout(db, 20, 10);
    expect(a.bounds!.width).toBe(15);
    expect(b.bounds!.width).toBe(5);
  });

  it("ignores unknown props without error", () => {
    const db = createDatabase();
    const node = addNode(db, {
      id: "n",
      type: "box",
      props: {},
      parentId: null,
    });
    // Text props like content, wrap should be silently ignored
    expect(() =>
      applyYogaStyles(node, { content: "hello" } as any),
    ).not.toThrow();
  });
});

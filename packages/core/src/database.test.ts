import { describe, expect, it } from "vitest";

import {
  addNode,
  computeLayout,
  createDatabase,
  removeNode,
} from "./database.ts";

describe("createDatabase", () => {
  it("initializes with empty nodes", () => {
    const database = createDatabase();
    expect(database.nodes.size).toBe(0);
    expect(database.rootId).toBeNull();
  });
});

describe("addNode / removeNode", () => {
  it("adds a root node", () => {
    const database = createDatabase();
    const node = addNode(database, {
      id: "root",
      type: "box",
      props: {},
      parentId: null,
    });
    expect(node.id).toBe("root");
    expect(database.rootId).toBe("root");
    expect(database.nodes.size).toBe(1);
  });

  it("adds a child node", () => {
    const database = createDatabase();
    addNode(database, { id: "root", type: "box", props: {}, parentId: null });
    addNode(database, {
      id: "child",
      type: "text",
      props: {},
      parentId: "root",
    });

    const root = database.nodes.get("root");
    expect(root?.childIds).toEqual(["child"]);
    expect(database.nodes.size).toBe(2);
  });

  it("removes a node and frees its yoga node", () => {
    const database = createDatabase();
    addNode(database, { id: "root", type: "box", props: {}, parentId: null });
    addNode(database, {
      id: "child",
      type: "text",
      props: {},
      parentId: "root",
    });

    removeNode(database, "child");
    expect(database.nodes.size).toBe(1);
    expect(database.nodes.get("root")?.childIds).toEqual([]);
  });

  it("removes a node with children recursively", () => {
    const database = createDatabase();
    addNode(database, { id: "root", type: "box", props: {}, parentId: null });
    addNode(database, {
      id: "child",
      type: "box",
      props: {},
      parentId: "root",
    });
    addNode(database, {
      id: "grandchild",
      type: "text",
      props: {},
      parentId: "child",
    });

    removeNode(database, "child");
    expect(database.nodes.size).toBe(1);
    expect(database.nodes.has("grandchild")).toBe(false);
  });

  it("clears rootId when root is removed", () => {
    const database = createDatabase();
    addNode(database, { id: "root", type: "box", props: {}, parentId: null });
    removeNode(database, "root");
    expect(database.rootId).toBeNull();
    expect(database.nodes.size).toBe(0);
  });
});

describe("computeLayout", () => {
  it("computes integer bounds for a single node", () => {
    const database = createDatabase();
    addNode(database, { id: "root", type: "box", props: {}, parentId: null });

    computeLayout(database, 20, 10);

    const root = database.nodes.get("root");
    expect(root?.bounds).toEqual({ x: 0, y: 0, width: 20, height: 10 });
  });

  it("notifies listeners on compute", () => {
    const database = createDatabase();
    addNode(database, { id: "root", type: "box", props: {}, parentId: null });

    let notified = false;
    database.listeners.add(() => {
      notified = true;
    });

    computeLayout(database, 20, 10);
    expect(notified).toBe(true);
  });
});

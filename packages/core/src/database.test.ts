import { describe, expect, it, vi } from "vitest";

import {
  addNode,
  computeLayout,
  createDatabase,
  removeNode,
  subscribe,
  updateNode,
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

describe("updateNode", () => {
  it("merges new props into existing node", () => {
    const database = createDatabase();
    addNode(database, {
      id: "root",
      type: "text",
      props: { content: "hello" },
      parentId: null,
    });

    updateNode(database, "root", { content: "world" });
    expect(database.nodes.get("root")!.props).toEqual({ content: "world" });
  });

  it("preserves existing props not in the update", () => {
    const database = createDatabase();
    addNode(database, {
      id: "root",
      type: "box",
      props: { color: "#f00", border: true },
      parentId: null,
    });

    updateNode(database, "root", { color: "#0f0" });
    const props = database.nodes.get("root")!.props;
    expect(props.color).toBe("#0f0");
    expect((props as any).border).toBe(true);
  });

  it("is a no-op for missing node", () => {
    const database = createDatabase();
    expect(() =>
      updateNode(database, "missing", { content: "x" }),
    ).not.toThrow();
  });
});

describe("subscribe", () => {
  it("calls listener on computeLayout", () => {
    const database = createDatabase();
    addNode(database, { id: "root", type: "box", props: {}, parentId: null });

    const listener = vi.fn();
    subscribe(database, listener);

    computeLayout(database, 10, 10);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("unsubscribe stops notifications", () => {
    const database = createDatabase();
    addNode(database, { id: "root", type: "box", props: {}, parentId: null });

    const listener = vi.fn();
    const unsub = subscribe(database, listener);

    computeLayout(database, 10, 10);
    expect(listener).toHaveBeenCalledOnce();

    unsub();
    computeLayout(database, 10, 10);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("multiple subscribers all receive notifications", () => {
    const database = createDatabase();
    addNode(database, { id: "root", type: "box", props: {}, parentId: null });

    const a = vi.fn();
    const b = vi.fn();
    subscribe(database, a);
    subscribe(database, b);

    computeLayout(database, 10, 10);
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });
});

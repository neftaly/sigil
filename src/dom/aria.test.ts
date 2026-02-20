// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { addNode, createDatabase, computeLayout } from "../core/database.ts";
import type { Database } from "../core/database.ts";
import { createAriaManager } from "./aria.ts";
import type { AriaManager } from "./aria.ts";

let container: HTMLElement;
let manager: AriaManager;
let database: Database;

function setup() {
  container = document.createElement("div");
  document.body.appendChild(container);
  manager = createAriaManager(container);
  database = createDatabase();
}

function teardown() {
  manager.dispose();
  document.body.removeChild(container);
}

/** Helper: add a root box node with layout so bounds are computed. */
function addRoot(db: Database, props: Record<string, unknown> = {}) {
  addNode(db, {
    id: "root",
    type: "box",
    props: { width: 80, height: 24, ...props },
    parentId: null,
  });
  computeLayout(db, 80, 24);
}

/** Helper: add a child box node under the root. */
function addChild(
  db: Database,
  id: string,
  props: Record<string, unknown> = {},
) {
  addNode(db, {
    id,
    type: "box",
    props: { width: 10, height: 2, ...props },
    parentId: "root",
  });
  computeLayout(db, 80, 24);
}

/** Get the ARIA overlay container (first child appended by the manager). */
function getAriaContainer(): HTMLElement {
  return container.lastElementChild as HTMLElement;
}

describe("createAriaManager", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("creates an ARIA overlay container inside the provided container", () => {
    const ariaContainer = getAriaContainer();
    expect(ariaContainer).toBeTruthy();
    expect(ariaContainer.style.position).toBe("absolute");
    expect(ariaContainer.style.top).toBe("0px");
    expect(ariaContainer.style.left).toBe("0px");
    expect(ariaContainer.style.width).toBe("100%");
    expect(ariaContainer.style.height).toBe("100%");
    expect(ariaContainer.style.pointerEvents).toBe("none");
  });
});

describe("role to element mapping", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("creates <input type=\"text\"> for textbox role", () => {
    addRoot(database);
    addChild(database, "input1", { role: "textbox" });
    manager.sync(database, 8, 16);

    const ariaContainer = getAriaContainer();
    const el = ariaContainer.querySelector("input[type='text']");
    expect(el).toBeTruthy();
  });

  it("creates <input type=\"number\"> for spinbutton role", () => {
    addRoot(database);
    addChild(database, "spin1", { role: "spinbutton" });
    manager.sync(database, 8, 16);

    const ariaContainer = getAriaContainer();
    const el = ariaContainer.querySelector("input[type='number']");
    expect(el).toBeTruthy();
  });

  it("creates <textarea> for textarea role", () => {
    addRoot(database);
    addChild(database, "ta1", { role: "textarea" });
    manager.sync(database, 8, 16);

    const ariaContainer = getAriaContainer();
    const el = ariaContainer.querySelector("textarea");
    expect(el).toBeTruthy();
  });

  it("creates <input type=\"checkbox\"> for checkbox role", () => {
    addRoot(database);
    addChild(database, "cb1", { role: "checkbox" });
    manager.sync(database, 8, 16);

    const ariaContainer = getAriaContainer();
    const el = ariaContainer.querySelector("input[type='checkbox']");
    expect(el).toBeTruthy();
  });

  it("creates <fieldset> for radiogroup role", () => {
    addRoot(database);
    addChild(database, "rg1", { role: "radiogroup" });
    manager.sync(database, 8, 16);

    const ariaContainer = getAriaContainer();
    const el = ariaContainer.querySelector("fieldset");
    expect(el).toBeTruthy();
  });

  it("creates <select> for listbox role", () => {
    addRoot(database);
    addChild(database, "lb1", { role: "listbox" });
    manager.sync(database, 8, 16);

    const ariaContainer = getAriaContainer();
    const el = ariaContainer.querySelector("select");
    expect(el).toBeTruthy();
  });

  it("creates <button> for button role", () => {
    addRoot(database);
    addChild(database, "btn1", { role: "button" });
    manager.sync(database, 8, 16);

    const ariaContainer = getAriaContainer();
    const el = ariaContainer.querySelector("button");
    expect(el).toBeTruthy();
  });

  it("creates <dialog> for dialog role", () => {
    addRoot(database);
    addChild(database, "dlg1", { role: "dialog" });
    manager.sync(database, 8, 16);

    const ariaContainer = getAriaContainer();
    const el = ariaContainer.querySelector("dialog");
    expect(el).toBeTruthy();
  });

  it("creates <input type=\"range\"> for slider role", () => {
    addRoot(database);
    addChild(database, "sl1", { role: "slider" });
    manager.sync(database, 8, 16);

    const ariaContainer = getAriaContainer();
    const el = ariaContainer.querySelector("input[type='range']");
    expect(el).toBeTruthy();
  });

  it("creates <div role=\"progressbar\"> for progressbar role", () => {
    addRoot(database);
    addChild(database, "pb1", { role: "progressbar" });
    manager.sync(database, 8, 16);

    const ariaContainer = getAriaContainer();
    const el = ariaContainer.querySelector("div[role='progressbar']");
    expect(el).toBeTruthy();
  });

  it("creates <div role=\"status\"> for status role", () => {
    addRoot(database);
    addChild(database, "st1", { role: "status" });
    manager.sync(database, 8, 16);

    const ariaContainer = getAriaContainer();
    const el = ariaContainer.querySelector("div[role='status']");
    expect(el).toBeTruthy();
  });

  it("creates <div role=\"...\"> for unknown roles", () => {
    addRoot(database);
    addChild(database, "custom1", { role: "navigation" });
    manager.sync(database, 8, 16);

    const ariaContainer = getAriaContainer();
    const el = ariaContainer.querySelector("div[role='navigation']");
    expect(el).toBeTruthy();
  });
});

describe("ARIA attribute syncing", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("syncs aria-label", () => {
    addRoot(database);
    addChild(database, "btn1", { role: "button", "aria-label": "Submit" });
    manager.sync(database, 8, 16);

    const el = getAriaContainer().querySelector("button")!;
    expect(el.getAttribute("aria-label")).toBe("Submit");
  });

  it("syncs aria-checked", () => {
    addRoot(database);
    addChild(database, "cb1", { role: "checkbox", "aria-checked": true });
    manager.sync(database, 8, 16);

    const el = getAriaContainer().querySelector("input[type='checkbox']")!;
    expect(el.getAttribute("aria-checked")).toBe("true");
  });

  it("syncs aria-checked with mixed value", () => {
    addRoot(database);
    addChild(database, "cb1", { role: "checkbox", "aria-checked": "mixed" });
    manager.sync(database, 8, 16);

    const el = getAriaContainer().querySelector("input[type='checkbox']")!;
    expect(el.getAttribute("aria-checked")).toBe("mixed");
  });

  it("syncs aria-expanded", () => {
    addRoot(database);
    addChild(database, "btn1", { role: "button", "aria-expanded": true });
    manager.sync(database, 8, 16);

    const el = getAriaContainer().querySelector("button")!;
    expect(el.getAttribute("aria-expanded")).toBe("true");
  });

  it("syncs aria-selected", () => {
    addRoot(database);
    addChild(database, "item1", {
      role: "listbox",
      "aria-selected": true,
    });
    manager.sync(database, 8, 16);

    const el = getAriaContainer().querySelector("select")!;
    expect(el.getAttribute("aria-selected")).toBe("true");
  });

  it("syncs numeric aria attributes (valuemin, valuemax, valuenow)", () => {
    addRoot(database);
    addChild(database, "sl1", {
      role: "slider",
      "aria-valuemin": 0,
      "aria-valuemax": 100,
      "aria-valuenow": 50,
      "aria-valuetext": "50%",
    });
    manager.sync(database, 8, 16);

    const el = getAriaContainer().querySelector("input[type='range']")!;
    expect(el.getAttribute("aria-valuemin")).toBe("0");
    expect(el.getAttribute("aria-valuemax")).toBe("100");
    expect(el.getAttribute("aria-valuenow")).toBe("50");
    expect(el.getAttribute("aria-valuetext")).toBe("50%");
  });

  it("syncs aria-describedby and aria-labelledby", () => {
    addRoot(database);
    addChild(database, "btn1", {
      role: "button",
      "aria-labelledby": "label1",
      "aria-describedby": "desc1",
    });
    manager.sync(database, 8, 16);

    const el = getAriaContainer().querySelector("button")!;
    expect(el.getAttribute("aria-labelledby")).toBe("label1");
    expect(el.getAttribute("aria-describedby")).toBe("desc1");
  });

  it("removes aria attributes when props are cleared", () => {
    addRoot(database);
    addChild(database, "btn1", { role: "button", "aria-label": "Submit" });
    manager.sync(database, 8, 16);

    const el = getAriaContainer().querySelector("button")!;
    expect(el.getAttribute("aria-label")).toBe("Submit");

    // Update the node props to remove aria-label
    const node = database.nodes.get("btn1")!;
    node.props = { width: 10, height: 2, role: "button" };
    manager.sync(database, 8, 16);

    expect(el.getAttribute("aria-label")).toBeNull();
  });

  it("sets disabled attribute on form elements and aria-disabled", () => {
    addRoot(database);
    addChild(database, "btn1", { role: "button", disabled: true });
    manager.sync(database, 8, 16);

    const el = getAriaContainer().querySelector("button")! as HTMLButtonElement;
    expect(el.getAttribute("aria-disabled")).toBe("true");
    expect(el.disabled).toBe(true);
  });

  it("clears disabled when prop is removed", () => {
    addRoot(database);
    addChild(database, "btn1", { role: "button", disabled: true });
    manager.sync(database, 8, 16);

    const el = getAriaContainer().querySelector("button")! as HTMLButtonElement;
    expect(el.disabled).toBe(true);

    // Remove disabled
    const node = database.nodes.get("btn1")!;
    node.props = { width: 10, height: 2, role: "button" };
    manager.sync(database, 8, 16);

    expect(el.disabled).toBe(false);
    expect(el.getAttribute("aria-disabled")).toBeNull();
  });
});

describe("positioning", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("positions elements based on grid bounds and cell dimensions", () => {
    addRoot(database);
    addChild(database, "btn1", { role: "button" });
    manager.sync(database, 8, 16);

    const btn = getAriaContainer().querySelector("button")!;
    const node = database.nodes.get("btn1")!;
    const bounds = node.bounds!;

    expect(btn.style.left).toBe(`${bounds.x * 8}px`);
    expect(btn.style.top).toBe(`${bounds.y * 16}px`);
    expect(btn.style.width).toBe(`${bounds.width * 8}px`);
    expect(btn.style.height).toBe(`${bounds.height * 16}px`);
  });

  it("makes elements visually hidden but accessible", () => {
    addRoot(database);
    addChild(database, "btn1", { role: "button" });
    manager.sync(database, 8, 16);

    const btn = getAriaContainer().querySelector("button")!;
    expect(btn.style.position).toBe("absolute");
    expect(btn.style.opacity).toBe("0");
    expect(btn.style.overflow).toBe("hidden");
    expect(btn.style.pointerEvents).toBe("none");
  });

  it("updates position when bounds change", () => {
    addRoot(database);
    addChild(database, "btn1", { role: "button", width: 10, height: 2 });
    manager.sync(database, 8, 16);

    const btn = getAriaContainer().querySelector("button")!;
    const initialHeight = btn.style.height;

    // Directly change bounds to simulate a layout change
    const node = database.nodes.get("btn1")!;
    node.bounds = { ...node.bounds!, height: node.bounds!.height + 5 };
    manager.sync(database, 8, 16);

    expect(btn.style.height).not.toBe(initialHeight);
  });
});

describe("stale element removal", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("removes DOM elements for nodes no longer in the database", () => {
    addRoot(database);
    addChild(database, "btn1", { role: "button" });
    addChild(database, "btn2", { role: "button" });
    manager.sync(database, 8, 16);

    const ariaContainer = getAriaContainer();
    expect(ariaContainer.querySelectorAll("button").length).toBe(2);

    // Remove btn2 from the database
    const rootNode = database.nodes.get("root")!;
    const btn2Node = database.nodes.get("btn2")!;
    btn2Node.yogaNode.unsetMeasureFunc();
    rootNode.yogaNode.removeChild(btn2Node.yogaNode);
    btn2Node.yogaNode.free();
    database.nodes.delete("btn2");
    rootNode.childIds = rootNode.childIds.filter((id) => id !== "btn2");

    manager.sync(database, 8, 16);
    expect(ariaContainer.querySelectorAll("button").length).toBe(1);
  });

  it("does not create elements for nodes without a role", () => {
    addRoot(database);
    addChild(database, "plain", { width: 5, height: 1 });
    manager.sync(database, 8, 16);

    const ariaContainer = getAriaContainer();
    // Only children should be ARIA elements; plain node has no role
    expect(ariaContainer.children.length).toBe(0);
  });

  it("does not create elements for nodes without bounds", () => {
    addRoot(database);
    addNode(database, {
      id: "nobounds",
      type: "box",
      props: { role: "button" },
      parentId: "root",
    });
    // Intentionally skip computeLayout so bounds remain null
    const node = database.nodes.get("nobounds")!;
    node.bounds = null;
    manager.sync(database, 8, 16);

    const ariaContainer = getAriaContainer();
    expect(ariaContainer.querySelectorAll("button").length).toBe(0);
  });
});

describe("dispose", () => {
  beforeEach(setup);
  afterEach(() => {
    // teardown already called dispose, just remove container
    document.body.removeChild(container);
  });

  it("removes all ARIA elements and the overlay container", () => {
    addRoot(database);
    addChild(database, "btn1", { role: "button" });
    addChild(database, "cb1", { role: "checkbox" });
    manager.sync(database, 8, 16);

    // Before dispose, ARIA container exists with children
    expect(container.querySelector("button")).toBeTruthy();
    expect(container.querySelector("input[type='checkbox']")).toBeTruthy();

    manager.dispose();

    // After dispose, no ARIA overlay container remains
    // The container should have no children (the ARIA container was the only child)
    expect(container.children.length).toBe(0);
  });
});

describe("role change", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("recreates the element when the role changes", () => {
    addRoot(database);
    addChild(database, "node1", { role: "button" });
    manager.sync(database, 8, 16);

    const ariaContainer = getAriaContainer();
    expect(ariaContainer.querySelector("button")).toBeTruthy();
    expect(ariaContainer.querySelector("input[type='checkbox']")).toBeNull();

    // Change role
    const node = database.nodes.get("node1")!;
    node.props = { ...node.props, role: "checkbox" };
    computeLayout(database, 80, 24);
    manager.sync(database, 8, 16);

    expect(ariaContainer.querySelector("button")).toBeNull();
    expect(ariaContainer.querySelector("input[type='checkbox']")).toBeTruthy();
  });
});

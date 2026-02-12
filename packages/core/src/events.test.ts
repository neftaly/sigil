import { describe, expect, it, vi } from "vitest";

import { addNode, computeLayout, createDatabase } from "./database.ts";
import {
  type KeyEvent,
  type PointerEvent,
  createEventState,
  dispatchKeyEvent,
  dispatchPointerEvent,
  focusNext,
  hitTest,
  releasePointerCapture,
  setFocus,
  setPointerCapture,
} from "./events.ts";

function setupTree() {
  const database = createDatabase();

  // Root: 20x10
  const root = addNode(database, {
    id: "root",
    type: "box",
    props: {},
    parentId: null,
  });
  root.yogaNode.setWidth(20);
  root.yogaNode.setHeight(10);
  root.yogaNode.setFlexDirection(database.yoga.FLEX_DIRECTION_ROW);

  // Left box: 10x10
  const left = addNode(database, {
    id: "left",
    type: "box",
    props: {},
    parentId: "root",
  });
  left.yogaNode.setWidth(10);
  left.yogaNode.setHeight(10);

  // Right box: 10x10
  const right = addNode(database, {
    id: "right",
    type: "box",
    props: {},
    parentId: "root",
  });
  right.yogaNode.setWidth(10);
  right.yogaNode.setHeight(10);

  computeLayout(database, 20, 10);

  return { database, root, left, right };
}

describe("hitTest", () => {
  it("returns the correct node for a point", () => {
    const { database } = setupTree();

    // Left box occupies 0-9
    const hitLeft = hitTest(database, 5, 5);
    expect(hitLeft?.id).toBe("left");

    // Right box occupies 10-19
    const hitRight = hitTest(database, 15, 5);
    expect(hitRight?.id).toBe("right");
  });

  it("returns null for out-of-bounds point", () => {
    const { database } = setupTree();
    const hit = hitTest(database, 25, 5);
    expect(hit).toBeNull();
  });

  it("returns frontmost node for overlapping absolute-positioned nodes", () => {
    const database = createDatabase();

    const root = addNode(database, {
      id: "root",
      type: "box",
      props: {},
      parentId: null,
    });
    root.yogaNode.setWidth(10);
    root.yogaNode.setHeight(10);

    // Background child
    const bg = addNode(database, {
      id: "bg",
      type: "box",
      props: {},
      parentId: "root",
    });
    bg.yogaNode.setWidth(10);
    bg.yogaNode.setHeight(10);

    // Foreground child (absolute, overlapping bg)
    const fg = addNode(database, {
      id: "fg",
      type: "box",
      props: {},
      parentId: "root",
    });
    fg.yogaNode.setPositionType(database.yoga.POSITION_TYPE_ABSOLUTE);
    fg.yogaNode.setWidth(5);
    fg.yogaNode.setHeight(5);
    fg.yogaNode.setPosition(database.yoga.EDGE_TOP, 0);
    fg.yogaNode.setPosition(database.yoga.EDGE_LEFT, 0);

    computeLayout(database, 10, 10);

    // Point in the overlap area should return fg (last child = frontmost)
    const hit = hitTest(database, 2, 2);
    expect(hit?.id).toBe("fg");

    // Point outside fg but inside bg
    const hit2 = hitTest(database, 8, 8);
    expect(hit2?.id).toBe("bg");
  });
});

describe("pointer events", () => {
  it("fires handler on the correct node", () => {
    const { database, left } = setupTree();
    const state = createEventState();

    const handler = vi.fn();
    left.props.onPointerDown = handler;

    const event: PointerEvent = {
      type: "pointerdown",
      col: 5,
      row: 5,
      button: 0,
    };
    dispatchPointerEvent(database, state, event);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(event);
  });

  it("bubble/capture order: parent capture fires before child handler", () => {
    const { database, root, left } = setupTree();
    const state = createEventState();

    const order: string[] = [];
    root.props.onPointerDownCapture = () => {
      order.push("root-capture");
    };
    left.props.onPointerDownCapture = () => {
      order.push("left-capture");
    };
    left.props.onPointerDown = () => {
      order.push("left-bubble");
    };
    root.props.onPointerDown = () => {
      order.push("root-bubble");
    };

    dispatchPointerEvent(database, state, {
      type: "pointerdown",
      col: 5,
      row: 5,
      button: 0,
    });

    expect(order).toEqual([
      "root-capture",
      "left-capture",
      "left-bubble",
      "root-bubble",
    ]);
  });

  it("pointer enter/leave fires when moving between nodes", () => {
    const { database, left, right } = setupTree();
    const state = createEventState();

    const events: string[] = [];
    left.props.onPointerEnter = () => {
      events.push("left-enter");
    };
    left.props.onPointerLeave = () => {
      events.push("left-leave");
    };
    right.props.onPointerEnter = () => {
      events.push("right-enter");
    };
    right.props.onPointerLeave = () => {
      events.push("right-leave");
    };

    // Move into left
    dispatchPointerEvent(database, state, {
      type: "pointermove",
      col: 5,
      row: 5,
      button: 0,
    });
    expect(events).toEqual(["left-enter"]);

    // Move to right
    events.length = 0;
    dispatchPointerEvent(database, state, {
      type: "pointermove",
      col: 15,
      row: 5,
      button: 0,
    });
    expect(events).toEqual(["left-leave", "right-enter"]);
  });

  it("pointer capture routes events to captured node", () => {
    const { database, left, right } = setupTree();
    const state = createEventState();

    const leftHandler = vi.fn();
    const rightHandler = vi.fn();
    left.props.onPointerMove = leftHandler;
    right.props.onPointerMove = rightHandler;

    // Capture pointer on left
    setPointerCapture(state, "left");

    // Move over right — should still go to left due to capture
    dispatchPointerEvent(database, state, {
      type: "pointermove",
      col: 15,
      row: 5,
      button: 0,
    });

    expect(leftHandler).toHaveBeenCalledOnce();
    expect(rightHandler).not.toHaveBeenCalled();

    // Release capture
    releasePointerCapture(state);

    // Now move over right — should go to right
    dispatchPointerEvent(database, state, {
      type: "pointermove",
      col: 15,
      row: 5,
      button: 0,
    });

    expect(rightHandler).toHaveBeenCalledOnce();
  });
});

describe("focus", () => {
  it("Tab cycles through focusable nodes", () => {
    const { database, left, right } = setupTree();
    const state = createEventState();

    left.props.focusable = true;
    right.props.focusable = true;

    // Tab -> focuses left (first focusable)
    dispatchKeyEvent(database, state, {
      type: "keydown",
      key: "Tab",
      code: "Tab",
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    });
    expect(state.focusedId).toBe("left");

    // Tab -> focuses right
    dispatchKeyEvent(database, state, {
      type: "keydown",
      key: "Tab",
      code: "Tab",
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    });
    expect(state.focusedId).toBe("right");

    // Tab -> wraps to left
    dispatchKeyEvent(database, state, {
      type: "keydown",
      key: "Tab",
      code: "Tab",
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    });
    expect(state.focusedId).toBe("left");
  });

  it("focus/blur handlers fire correctly", () => {
    const { database, left, right } = setupTree();
    const state = createEventState();

    left.props.focusable = true;
    right.props.focusable = true;

    const events: string[] = [];
    left.props.onFocus = () => {
      events.push("left-focus");
    };
    left.props.onBlur = () => {
      events.push("left-blur");
    };
    right.props.onFocus = () => {
      events.push("right-focus");
    };

    // Focus left
    setFocus(database, state, "left");
    expect(events).toEqual(["left-focus"]);

    // Focus right -> blur left, focus right
    events.length = 0;
    setFocus(database, state, "right");
    expect(events).toEqual(["left-blur", "right-focus"]);
  });

  it("focused node unmounted resets focus", () => {
    const { database, left } = setupTree();
    const state = createEventState();

    left.props.focusable = true;
    setFocus(database, state, "left");
    expect(state.focusedId).toBe("left");

    // Simulate unmount by checking the node doesn't exist
    // The actual focus reset should happen when dispatching an event
    // And the focused node is gone. Let's verify focusNext handles it.
    database.nodes.delete("left");
    focusNext(database, state);

    // Should focus the next available focusable node (right)
    // But right isn't focusable in this test, so it stays
    // Let's make root focusable
    const root = database.nodes.get("root")!;
    root.props.focusable = true;
    focusNext(database, state);
    expect(state.focusedId).toBe("root");
  });

  it("key events dispatch to focused node with capture/bubble", () => {
    const { database, root, left } = setupTree();
    const state = createEventState();

    left.props.focusable = true;
    setFocus(database, state, "left");

    const order: string[] = [];
    root.props.onKeyDownCapture = () => {
      order.push("root-capture");
    };
    left.props.onKeyDown = () => {
      order.push("left-keydown");
    };
    root.props.onKeyDown = () => {
      order.push("root-keydown");
    };

    const event: KeyEvent = {
      type: "keydown",
      key: "a",
      code: "KeyA",
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    };
    dispatchKeyEvent(database, state, event);

    expect(order).toEqual(["root-capture", "left-keydown", "root-keydown"]);
  });
});

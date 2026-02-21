import { describe, expect, it, vi } from "vitest";

import { addNode, computeLayout, createDatabase } from "./database.ts";
import {
  type KeyEvent,
  type PointerEvent,
  type TextUpdateEvent,
  createEventState,
  dispatchKeyEvent,
  dispatchPointerEvent,
  dispatchTextUpdateEvent,
  focusRelative,
  hitTest,
  isNavigationKey,
  clearPointerCapture,
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
      shiftKey: false,
    };
    dispatchPointerEvent(database, state, event);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({
      ...event,
      targetBounds: left.bounds,
    });
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
      shiftKey: false,
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
      shiftKey: false,
    });
    expect(events).toEqual(["left-enter"]);

    // Move to right
    events.length = 0;
    dispatchPointerEvent(database, state, {
      type: "pointermove",
      col: 15,
      row: 5,
      button: 0,
      shiftKey: false,
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
      shiftKey: false,
    });

    expect(leftHandler).toHaveBeenCalledOnce();
    expect(rightHandler).not.toHaveBeenCalled();

    // Release capture
    clearPointerCapture(state);

    // Now move over right — should go to right
    dispatchPointerEvent(database, state, {
      type: "pointermove",
      col: 15,
      row: 5,
      button: 0,
      shiftKey: false,
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
    // And the focused node is gone. Let's verify focusRelative handles it.
    database.nodes.delete("left");
    focusRelative(database, state, 1);

    // Should focus the next available focusable node (right)
    // But right isn't focusable in this test, so it stays
    // Let's make root focusable
    const root = database.nodes.get("root")!;
    root.props.focusable = true;
    focusRelative(database, state, 1);
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

describe("stopPropagation", () => {
  it("key event: handler returning true stops bubbling to parent", () => {
    const { database, root, left } = setupTree();
    const state = createEventState();

    left.props.focusable = true;
    setFocus(database, state, "left");

    const order: string[] = [];
    left.props.onKeyDown = () => {
      order.push("left-keydown");
      return true; // stop propagation
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
    const result = dispatchKeyEvent(database, state, event);

    expect(order).toEqual(["left-keydown"]);
    expect(result).toBe(true);
  });

  it("pointer event: handler returning true stops bubbling to parent", () => {
    const { database, root, left } = setupTree();
    const state = createEventState();

    const order: string[] = [];
    left.props.onPointerDown = () => {
      order.push("left-pointerdown");
      return true; // stop propagation
    };
    root.props.onPointerDown = () => {
      order.push("root-pointerdown");
    };

    const result = dispatchPointerEvent(database, state, {
      type: "pointerdown",
      col: 5,
      row: 5,
      button: 0,
      shiftKey: false,
    });

    expect(order).toEqual(["left-pointerdown"]);
    expect(result).toBe(true);
  });

  it("handler returning void does not stop propagation", () => {
    const { database, root, left } = setupTree();
    const state = createEventState();

    left.props.focusable = true;
    setFocus(database, state, "left");

    const order: string[] = [];
    left.props.onKeyDown = () => {
      order.push("left-keydown");
      // no return / returns void
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

    expect(order).toEqual(["left-keydown", "root-keydown"]);
  });

  it("capture handler returning true stops before bubble phase", () => {
    const { database, root, left } = setupTree();
    const state = createEventState();

    left.props.focusable = true;
    setFocus(database, state, "left");

    const order: string[] = [];
    root.props.onKeyDownCapture = () => {
      order.push("root-capture");
      return true; // stop in capture phase
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
    const result = dispatchKeyEvent(database, state, event);

    expect(order).toEqual(["root-capture"]);
    expect(result).toBe(true);
  });

  it("returns false when no handlers exist", () => {
    const { database } = setupTree();
    const state = createEventState();

    const result = dispatchKeyEvent(database, state, {
      type: "keydown",
      key: "a",
      code: "KeyA",
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    });

    expect(result).toBe(false);
  });
});

describe("isNavigationKey", () => {
  it("returns true for arrow keys", () => {
    expect(isNavigationKey("ArrowLeft")).toBe(true);
    expect(isNavigationKey("ArrowRight")).toBe(true);
    expect(isNavigationKey("ArrowUp")).toBe(true);
    expect(isNavigationKey("ArrowDown")).toBe(true);
  });

  it("returns true for Home, End, Tab, Escape, Enter", () => {
    expect(isNavigationKey("Home")).toBe(true);
    expect(isNavigationKey("End")).toBe(true);
    expect(isNavigationKey("Tab")).toBe(true);
    expect(isNavigationKey("Escape")).toBe(true);
    expect(isNavigationKey("Enter")).toBe(true);
  });

  it("returns false for printable characters", () => {
    expect(isNavigationKey("a")).toBe(false);
    expect(isNavigationKey("Z")).toBe(false);
    expect(isNavigationKey("1")).toBe(false);
    expect(isNavigationKey(" ")).toBe(false);
  });

  it("returns false for modifier keys", () => {
    expect(isNavigationKey("Shift")).toBe(false);
    expect(isNavigationKey("Control")).toBe(false);
    expect(isNavigationKey("Alt")).toBe(false);
    expect(isNavigationKey("Meta")).toBe(false);
  });

  it("returns false for other special keys", () => {
    expect(isNavigationKey("Backspace")).toBe(false);
    expect(isNavigationKey("Delete")).toBe(false);
    expect(isNavigationKey("F1")).toBe(false);
  });
});

describe("dispatchTextUpdateEvent", () => {
  it("dispatches to focused node with capture and bubble", () => {
    const { database, root, left } = setupTree();
    const state = createEventState();

    left.props.focusable = true;
    setFocus(database, state, "left");

    const order: string[] = [];
    root.props.onTextUpdateCapture = () => {
      order.push("root-capture");
    };
    left.props.onTextUpdateCapture = () => {
      order.push("left-capture");
    };
    left.props.onTextUpdate = () => {
      order.push("left-bubble");
    };
    root.props.onTextUpdate = () => {
      order.push("root-bubble");
    };

    const event: TextUpdateEvent = {
      type: "textupdate",
      text: "hello",
      updateRangeStart: 0,
      updateRangeEnd: 0,
      selectionStart: 5,
      selectionEnd: 5,
    };
    dispatchTextUpdateEvent(database, state, event);

    expect(order).toEqual([
      "root-capture",
      "left-capture",
      "left-bubble",
      "root-bubble",
    ]);
  });

  it("does nothing when no node is focused", () => {
    const { database, left } = setupTree();
    const state = createEventState();

    const handler = vi.fn();
    left.props.onTextUpdate = handler;

    dispatchTextUpdateEvent(database, state, {
      type: "textupdate",
      text: "hello",
      updateRangeStart: 0,
      updateRangeEnd: 0,
      selectionStart: 5,
      selectionEnd: 5,
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("does nothing when focused node no longer exists", () => {
    const { database } = setupTree();
    const state = createEventState();

    state.focusedId = "nonexistent";

    // Should not throw
    dispatchTextUpdateEvent(database, state, {
      type: "textupdate",
      text: "hello",
      updateRangeStart: 0,
      updateRangeEnd: 0,
      selectionStart: 5,
      selectionEnd: 5,
    });
  });
});

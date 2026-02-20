import type { Bounds, Database, LayoutNode } from "./database.ts";
import type { EventHandlerProps } from "./types.ts";

// --- Event types ---

export interface PointerEvent {
  readonly type:
    | "pointerdown"
    | "pointerup"
    | "pointermove"
    | "pointerenter"
    | "pointerleave"
    | "pointercancel";
  readonly col: number;
  readonly row: number;
  readonly button: number;
  readonly shiftKey: boolean;
  readonly targetBounds?: Bounds;
}

export interface KeyEvent {
  readonly type: "keydown" | "keyup";
  readonly key: string;
  readonly code: string;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
}

export interface FocusEvent {
  readonly type: "focus" | "blur";
  readonly nodeId: string;
}

export interface TextUpdateEvent {
  readonly type: "textupdate";
  readonly text: string;
  readonly updateRangeStart: number;
  readonly updateRangeEnd: number;
  readonly selectionStart: number;
  readonly selectionEnd: number;
}

// --- Event state ---

export interface EventState {
  focusedId: string | null;
  capturedNodeId: string | null;
  hoveredNodeId: string | null;
}

export function createEventState(): EventState {
  return {
    focusedId: null,
    capturedNodeId: null,
    hoveredNodeId: null,
  };
}

// --- Hit testing ---

/**
 * Find the frontmost (deepest) node at grid coordinates (col, row).
 * Walks the tree back-to-front (last child first) for correct z-order.
 */
export function hitTest(
  database: Database,
  col: number,
  row: number,
): LayoutNode | null {
  if (!database.rootId) {
    return null;
  }
  const root = database.nodes.get(database.rootId);
  if (!root) {
    return null;
  }
  return hitTestNode(database, root, col, row);
}

function hitTestNode(
  database: Database,
  node: LayoutNode,
  col: number,
  row: number,
): LayoutNode | null {
  const { bounds } = node;
  if (!bounds) {
    return null;
  }

  // Check if point is within this node's bounds
  if (
    col < bounds.x ||
    col >= bounds.x + bounds.width ||
    row < bounds.y ||
    row >= bounds.y + bounds.height
  ) {
    return null;
  }

  // Check children back-to-front (last child = frontmost)
  for (let i = node.childIds.length - 1; i >= 0; i--) {
    const child = database.nodes.get(node.childIds[i]);
    if (child) {
      const hit = hitTestNode(database, child, col, row);
      if (hit) {
        return hit;
      }
    }
  }

  return node;
}

// --- Focus management ---

/**
 * Set focus to a node. Fires blur on the old node and focus on the new one.
 */
export function setFocus(
  database: Database,
  state: EventState,
  nodeId: string | null,
) {
  const oldId = state.focusedId;
  if (oldId === nodeId) {
    return;
  }

  state.focusedId = nodeId;

  if (oldId) {
    const oldNode = database.nodes.get(oldId);
    if (oldNode?.props.onBlur) {
      oldNode.props.onBlur({ type: "blur", nodeId: oldId });
    }
  }

  if (nodeId) {
    const newNode = database.nodes.get(nodeId);
    if (newNode?.props.onFocus) {
      newNode.props.onFocus({ type: "focus", nodeId });
    }
  }
}

/**
 * Cycle focus forward (+1) or backward (-1) through focusable nodes.
 */
export function focusRelative(
  database: Database,
  state: EventState,
  direction: 1 | -1,
) {
  const focusable = collectFocusable(database);
  if (focusable.length === 0) {
    return;
  }

  const currentIndex = focusable.findIndex((n) => n.id === state.focusedId);
  const nextIndex =
    (currentIndex + direction + focusable.length) % focusable.length;
  setFocus(database, state, focusable[nextIndex].id);
}

/**
 * Find the first focusable node at or below the given node (depth-first).
 */
export function findFocusable(
  database: Database,
  nodeId: string,
): LayoutNode | null {
  const node = database.nodes.get(nodeId);
  if (!node) {
    return null;
  }
  if (node.props.focusable) {
    return node;
  }
  for (const childId of node.childIds) {
    const found = findFocusable(database, childId);
    if (found) {
      return found;
    }
  }
  return null;
}

function collectFocusable(database: Database): LayoutNode[] {
  const nodes: LayoutNode[] = [];
  if (!database.rootId) {
    return nodes;
  }

  function walk(nodeId: string) {
    const node = database.nodes.get(nodeId);
    if (!node) {
      return;
    }
    if (node.props.focusable) {
      nodes.push(node);
    }
    for (const childId of node.childIds) {
      walk(childId);
    }
  }

  walk(database.rootId);

  // Sort by tabIndex (lower first), nodes without tabIndex come after
  nodes.sort((a, b) => {
    const aIdx = a.props.tabIndex ?? Infinity;
    const bIdx = b.props.tabIndex ?? Infinity;
    return aIdx - bIdx;
  });

  return nodes;
}

// --- Pointer capture ---

export function setPointerCapture(state: EventState, nodeId: string) {
  state.capturedNodeId = nodeId;
}

export function releasePointerCapture(state: EventState) {
  state.capturedNodeId = null;
}

export function setHoveredNode(state: EventState, nodeId: string | null) {
  state.hoveredNodeId = nodeId;
}

/**
 * Handle a pointerdown: focus the hit node (or nearest focusable descendant),
 * then dispatch the event. Centralizes focus logic so backends don't duplicate it.
 */
export function focusAndDispatch(
  database: Database,
  state: EventState,
  event: PointerEvent,
): void {
  const target = hitTest(database, event.col, event.row);
  if (target) {
    const focusTarget = target.props.focusable
      ? target
      : findFocusable(database, target.id);
    if (focusTarget) {
      setFocus(database, state, focusTarget.id);
    }
  }
  dispatchPointerEvent(database, state, event);
}

// --- Event dispatch ---

/**
 * Dispatch a pointer event. Handles capture -> target -> bubble.
 * If pointer capture is active, routes all events to the captured node.
 * Returns true if any handler was called.
 * A handler returning true stops further bubbling.
 */
export function dispatchPointerEvent(
  database: Database,
  state: EventState,
  event: PointerEvent,
): boolean {
  // Pointer capture overrides hit test
  let target: LayoutNode | null = null;
  if (state.capturedNodeId) {
    target = database.nodes.get(state.capturedNodeId) ?? null;
  } else {
    target = hitTest(database, event.col, event.row);
  }

  // Update hover state and fire enter/leave before the main event,
  // So any re-entrant dispatch sees the correct current state.
  if (event.type === "pointermove" || event.type === "pointerdown") {
    updateHover(database, state, target, event);
  }

  if (!target) {
    return false;
  }

  // Attach target bounds so handlers can compute relative positions
  const dispatched: PointerEvent = target.bounds
    ? { ...event, targetBounds: target.bounds }
    : event;

  // Build path from root to target for capture/bubble
  const path = buildPathToNode(database, target);
  let handled = false;

  // Capture phase (root -> target, fire *Capture handlers)
  const captureHandler = getCaptureHandlerName(dispatched.type);
  if (captureHandler) {
    for (const node of path) {
      if (fireHandler(node, captureHandler, dispatched) === true) {
        return true;
      }
      if (node.props[captureHandler]) handled = true;
    }
  }

  // Target + bubble phase (target -> root, fire regular handlers)
  const bubbleHandler = getBubbleHandlerName(dispatched.type);
  if (bubbleHandler) {
    for (let i = path.length - 1; i >= 0; i--) {
      if (fireHandler(path[i], bubbleHandler, dispatched) === true) {
        return true;
      }
      if (path[i].props[bubbleHandler]) handled = true;
    }
  }

  return handled;
}

/**
 * Dispatch a key event to the focused node. Capture -> target -> bubble.
 * Returns true if any handler was called.
 * A handler returning true stops further bubbling.
 */
export function dispatchKeyEvent(
  database: Database,
  state: EventState,
  event: KeyEvent,
): boolean {
  // Tab handling
  if (event.type === "keydown" && event.key === "Tab") {
    focusRelative(database, state, event.shiftKey ? -1 : 1);
    return true;
  }

  if (!state.focusedId) {
    return false;
  }

  const target = database.nodes.get(state.focusedId);
  if (!target) {
    return false;
  }

  const path = buildPathToNode(database, target);
  let handled = false;

  // Capture phase
  const captureHandler: keyof EventHandlerProps =
    event.type === "keydown" ? "onKeyDownCapture" : "onKeyUpCapture";
  for (const node of path) {
    if (fireHandler(node, captureHandler, event) === true) {
      return true;
    }
    if (node.props[captureHandler]) handled = true;
  }

  // Bubble phase
  const bubbleHandler: keyof EventHandlerProps =
    event.type === "keydown" ? "onKeyDown" : "onKeyUp";
  for (let i = path.length - 1; i >= 0; i--) {
    if (fireHandler(path[i], bubbleHandler, event) === true) {
      return true;
    }
    if (path[i].props[bubbleHandler]) handled = true;
  }

  return handled;
}

// --- Helpers ---

function updateHover(
  database: Database,
  state: EventState,
  target: LayoutNode | null,
  event: PointerEvent,
) {
  const newHoveredId = target?.id ?? null;
  const oldHoveredId = state.hoveredNodeId;
  if (newHoveredId === oldHoveredId) {
    return;
  }

  setHoveredNode(state, newHoveredId);

  if (oldHoveredId) {
    const oldNode = database.nodes.get(oldHoveredId);
    if (oldNode) {
      fireHandler(oldNode, "onPointerLeave", {
        ...event,
        type: "pointerleave",
      });
    }
  }

  if (target) {
    fireHandler(target, "onPointerEnter", {
      ...event,
      type: "pointerenter",
    });
  }
}

function buildPathToNode(database: Database, target: LayoutNode): LayoutNode[] {
  const path: LayoutNode[] = [];
  let current: LayoutNode | undefined = target;
  while (current) {
    path.push(current);
    if (current.parentId) {
      current = database.nodes.get(current.parentId);
    } else {
      break;
    }
  }
  path.reverse();
  return path;
}

function fireHandler(
  node: LayoutNode,
  handlerName: keyof EventHandlerProps,
  event: PointerEvent | KeyEvent | FocusEvent | TextUpdateEvent,
): boolean | void {
  const handler = node.props[handlerName] as
    | ((event: PointerEvent | KeyEvent | FocusEvent | TextUpdateEvent) => boolean | void)
    | undefined;
  return handler?.(event);
}

const CAPTURE_HANDLER_MAP = {
  pointerdown: "onPointerDownCapture",
  pointerup: "onPointerUpCapture",
  pointermove: "onPointerMoveCapture",
  pointercancel: "onPointerCancelCapture",
} satisfies Record<string, keyof EventHandlerProps>;

const BUBBLE_HANDLER_MAP = {
  pointerdown: "onPointerDown",
  pointerup: "onPointerUp",
  pointermove: "onPointerMove",
  pointerenter: "onPointerEnter",
  pointerleave: "onPointerLeave",
  pointercancel: "onPointerCancel",
} satisfies Record<string, keyof EventHandlerProps>;

function getCaptureHandlerName(type: string): keyof EventHandlerProps | null {
  return type in CAPTURE_HANDLER_MAP
    ? CAPTURE_HANDLER_MAP[type as keyof typeof CAPTURE_HANDLER_MAP]
    : null;
}

function getBubbleHandlerName(type: string): keyof EventHandlerProps | null {
  return type in BUBBLE_HANDLER_MAP
    ? BUBBLE_HANDLER_MAP[type as keyof typeof BUBBLE_HANDLER_MAP]
    : null;
}

/**
 * Dispatch a text update event to the focused node. Capture -> target -> bubble.
 * Used by EditContext to deliver text input changes.
 * Returns true if any handler was called.
 * A handler returning true stops further bubbling.
 */
export function dispatchTextUpdateEvent(
  database: Database,
  state: EventState,
  event: TextUpdateEvent,
): boolean {
  if (!state.focusedId) {
    return false;
  }

  const target = database.nodes.get(state.focusedId);
  if (!target) {
    return false;
  }

  const path = buildPathToNode(database, target);
  let handled = false;

  // Capture phase
  for (const node of path) {
    if (fireHandler(node, "onTextUpdateCapture", event) === true) {
      return true;
    }
    if (node.props.onTextUpdateCapture) handled = true;
  }

  // Bubble phase
  for (let i = path.length - 1; i >= 0; i--) {
    if (fireHandler(path[i], "onTextUpdate", event) === true) {
      return true;
    }
    if (path[i].props.onTextUpdate) handled = true;
  }

  return handled;
}

/**
 * Returns true if the key is a navigation/modifier key that should
 * go through dispatchKeyEvent rather than being handled by EditContext.
 */
export function isNavigationKey(key: string): boolean {
  switch (key) {
    case "ArrowLeft":
    case "ArrowRight":
    case "ArrowUp":
    case "ArrowDown":
    case "Home":
    case "End":
    case "Tab":
    case "Escape":
    case "Enter":
      return true;
    default:
      return false;
  }
}

import type { Bounds, Database, LayoutNode } from "./database.ts";
import type { EventHandlerProps } from "./types.ts";

// --- Event types ---

export interface PointerEvent {
  type:
    | "pointerdown"
    | "pointerup"
    | "pointermove"
    | "pointerenter"
    | "pointerleave";
  col: number;
  row: number;
  button: number;
  targetBounds?: Bounds;
}

export interface KeyEvent {
  type: "keydown" | "keyup";
  key: string;
  code: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

export interface FocusEvent {
  type: "focus" | "blur";
  nodeId: string;
}

export type CharuiEvent = PointerEvent | KeyEvent | FocusEvent;

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
    col >= bounds.x + bounds.w ||
    row < bounds.y ||
    row >= bounds.y + bounds.h
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
 * Cycle focus to the next focusable node (tab order).
 * Collects all focusable nodes via tree walk, sorts by tabIndex, cycles.
 */
export function focusNext(database: Database, state: EventState) {
  const focusable = collectFocusable(database);
  if (focusable.length === 0) {
    return;
  }

  const currentIndex = focusable.findIndex((n) => n.id === state.focusedId);
  const nextIndex = (currentIndex + 1) % focusable.length;
  setFocus(database, state, focusable[nextIndex].id);
}

/**
 * Cycle focus to the previous focusable node (shift+tab).
 */
export function focusPrev(database: Database, state: EventState) {
  const focusable = collectFocusable(database);
  if (focusable.length === 0) {
    return;
  }

  const currentIndex = focusable.findIndex((n) => n.id === state.focusedId);
  const prevIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
  setFocus(database, state, focusable[prevIndex].id);
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
    const aIdx = (a.props.tabIndex as number | undefined) ?? Infinity;
    const bIdx = (b.props.tabIndex as number | undefined) ?? Infinity;
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

// --- Event dispatch ---

/**
 * Dispatch a pointer event. Handles capture -> target -> bubble.
 * If pointer capture is active, routes all events to the captured node.
 */
export function dispatchPointerEvent(
  database: Database,
  state: EventState,
  event: PointerEvent,
) {
  // Pointer capture overrides hit test
  let target: LayoutNode | null = null;
  if (state.capturedNodeId) {
    target = database.nodes.get(state.capturedNodeId) ?? null;
  } else {
    target = hitTest(database, event.col, event.row);
  }

  // Handle enter/leave
  if (event.type === "pointermove" || event.type === "pointerdown") {
    const newHoveredId = target?.id ?? null;
    if (newHoveredId !== state.hoveredNodeId) {
      // Fire leave on old
      if (state.hoveredNodeId) {
        const oldNode = database.nodes.get(state.hoveredNodeId);
        if (oldNode) {
          fireHandler(oldNode, "onPointerLeave", {
            ...event,
            type: "pointerleave",
          });
        }
      }
      // Fire enter on new
      if (target) {
        fireHandler(target, "onPointerEnter", {
          ...event,
          type: "pointerenter",
        });
      }
      state.hoveredNodeId = newHoveredId;
    }
  }

  if (!target) {
    return;
  }

  // Attach target bounds so handlers can compute relative positions
  if (target.bounds) {
    event.targetBounds = target.bounds;
  }

  // Build path from root to target for capture/bubble
  const path = buildPathToNode(database, target);

  // Capture phase (root -> target, fire *Capture handlers)
  const captureHandler = getCaptureHandlerName(event.type);
  if (captureHandler) {
    for (const node of path) {
      fireHandler(node, captureHandler, event);
    }
  }

  // Target + bubble phase (target -> root, fire regular handlers)
  const bubbleHandler = getBubbleHandlerName(event.type);
  if (bubbleHandler) {
    for (let i = path.length - 1; i >= 0; i--) {
      fireHandler(path[i], bubbleHandler, event);
    }
  }
}

/**
 * Dispatch a key event to the focused node. Capture -> target -> bubble.
 */
export function dispatchKeyEvent(
  database: Database,
  state: EventState,
  event: KeyEvent,
) {
  // Tab handling
  if (event.type === "keydown" && event.key === "Tab") {
    if (event.shiftKey) {
      focusPrev(database, state);
    } else {
      focusNext(database, state);
    }
    return;
  }

  if (!state.focusedId) {
    return;
  }

  const target = database.nodes.get(state.focusedId);
  if (!target) {
    return;
  }

  const path = buildPathToNode(database, target);

  // Capture phase
  const captureHandler: keyof EventHandlerProps =
    event.type === "keydown" ? "onKeyDownCapture" : "onKeyUpCapture";
  for (const node of path) {
    fireHandler(node, captureHandler, event);
  }

  // Bubble phase
  const bubbleHandler: keyof EventHandlerProps =
    event.type === "keydown" ? "onKeyDown" : "onKeyUp";
  for (let i = path.length - 1; i >= 0; i--) {
    fireHandler(path[i], bubbleHandler, event);
  }
}

// --- Helpers ---

function buildPathToNode(database: Database, target: LayoutNode): LayoutNode[] {
  const path: LayoutNode[] = [];
  let current: LayoutNode | undefined = target;
  while (current) {
    path.unshift(current);
    if (current.parentId) {
      current = database.nodes.get(current.parentId);
    } else {
      break;
    }
  }
  return path;
}

function fireHandler(
  node: LayoutNode,
  handlerName: keyof EventHandlerProps,
  event: PointerEvent | KeyEvent | FocusEvent,
) {
  const handler = node.props[handlerName];
  if (typeof handler === "function") {
    (handler as (event: PointerEvent | KeyEvent | FocusEvent) => void)(event);
  }
}

function getCaptureHandlerName(type: string): keyof EventHandlerProps | null {
  const map: Record<string, keyof EventHandlerProps> = {
    pointerdown: "onPointerDownCapture",
    pointerup: "onPointerUpCapture",
    pointermove: "onPointerMoveCapture",
  };
  return map[type] ?? null;
}

function getBubbleHandlerName(type: string): keyof EventHandlerProps | null {
  const map: Record<string, keyof EventHandlerProps> = {
    pointerdown: "onPointerDown",
    pointerup: "onPointerUp",
    pointermove: "onPointerMove",
    pointerenter: "onPointerEnter",
    pointerleave: "onPointerLeave",
  };
  return map[type] ?? null;
}

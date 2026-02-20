import yoga, { type Node as YogaNode } from "yoga-layout";

import type { BoxNodeProps, LayoutProps, NodeProps } from "./types.ts";

export type { YogaNode };

export interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type NodeType = "box" | "text";

export interface LayoutNode {
  readonly id: string;
  readonly type: NodeType;
  props: NodeProps;
  parentId: string | null;
  childIds: string[];
  bounds: Bounds | null;
  readonly yogaNode: YogaNode;
}

export interface Database {
  readonly yoga: typeof yoga;
  readonly nodes: Map<string, LayoutNode>;
  rootId: string | null;
  readonly listeners: Set<() => void>;
}

export function createDatabase(): Database {
  return {
    yoga,
    nodes: new Map(),
    rootId: null,
    listeners: new Set(),
  };
}

export function subscribe(
  database: Database,
  listener: () => void,
): () => void {
  database.listeners.add(listener);
  return () => database.listeners.delete(listener);
}

let notifying = false;

function notifyListeners(database: Database) {
  if (notifying) {
    return;
  }
  notifying = true;
  try {
    for (const listener of [...database.listeners]) {
      listener();
    }
  } finally {
    notifying = false;
  }
}

export function addNode(
  database: Database,
  options: {
    id: string;
    type: NodeType;
    props: NodeProps;
    parentId: string | null;
  },
): LayoutNode {
  const yogaNode = database.yoga.Node.create();
  const node: LayoutNode = {
    id: options.id,
    type: options.type,
    props: options.props,
    parentId: options.parentId,
    childIds: [],
    bounds: null,
    yogaNode,
  };

  database.nodes.set(options.id, node);

  if (options.parentId === null) {
    database.rootId = options.id;
  } else {
    const parent = database.nodes.get(options.parentId);
    if (parent) {
      parent.childIds.push(options.id);
      parent.yogaNode.insertChild(yogaNode, parent.childIds.length - 1);
    }
  }

  return node;
}

export function removeNode(database: Database, id: string) {
  const node = database.nodes.get(id);
  if (!node) {
    return;
  }

  // Remove children first (depth-first)
  for (const childId of [...node.childIds]) {
    removeNode(database, childId);
  }

  // Detach from parent
  if (node.parentId) {
    const parent = database.nodes.get(node.parentId);
    if (parent) {
      const index = parent.childIds.indexOf(id);
      if (index !== -1) {
        parent.childIds.splice(index, 1);
        parent.yogaNode.removeChild(node.yogaNode);
      }
    }
  }

  if (database.rootId === id) {
    database.rootId = null;
  }

  // Cleanup Yoga node: unset measureFunc before freeing to prevent crashes
  node.yogaNode.unsetMeasureFunc();
  node.yogaNode.free();
  database.nodes.delete(id);
}

export function updateNode(
  database: Database,
  id: string,
  props: Partial<NodeProps>,
) {
  const node = database.nodes.get(id);
  if (!node) {
    return;
  }
  node.props = { ...node.props, ...props };
}

export function computeLayout(
  database: Database,
  width: number,
  height: number,
) {
  if (!database.rootId) {
    return;
  }

  const root = database.nodes.get(database.rootId);
  if (!root) {
    return;
  }

  root.yogaNode.calculateLayout(width, height);

  function extractBounds(nodeId: string, offsetX: number, offsetY: number) {
    const node = database.nodes.get(nodeId);
    if (!node) {
      return;
    }

    const layout = node.yogaNode.getComputedLayout();
    const x = offsetX + Math.floor(layout.left);
    const y = offsetY + Math.floor(layout.top);
    const w = Math.ceil(layout.width);
    const h = Math.ceil(layout.height);

    node.bounds = { x, y, width: w, height: h };

    for (const childId of node.childIds) {
      extractBounds(childId, x, y);
    }
  }

  extractBounds(database.rootId, 0, 0);

  notifyListeners(database);
}

/**
 * Compute the scroll offset needed on the nearest scrollable ancestor
 * to make the given node fully visible.
 * Returns null if no scrollable ancestor exists or the node is not found.
 */
export function scrollIntoView(
  database: Database,
  nodeId: string,
): { scrollX: number; scrollY: number } | null {
  const node = database.nodes.get(nodeId);
  if (!node?.bounds) {
    return null;
  }

  // Walk up the tree to find the nearest scrollable ancestor
  let current = node.parentId ? database.nodes.get(node.parentId) : undefined;
  while (current) {
    const lp = current.props as Partial<LayoutProps>;
    const overflow = lp.overflow;
    if (
      (overflow === "scroll" || overflow === "hidden") &&
      current.bounds
    ) {
      // Found the scrollable ancestor
      const boxProps = current.props as Partial<BoxNodeProps>;
      const borderInset = boxProps.border ? 1 : 0;
      const contentX = current.bounds.x + borderInset;
      const contentY = current.bounds.y + borderInset;
      const contentW = Math.max(0, current.bounds.width - borderInset * 2);
      const contentH = Math.max(0, current.bounds.height - borderInset * 2);

      const currentScrollX = lp.scrollX ?? 0;
      const currentScrollY = lp.scrollY ?? 0;

      // Node position relative to ancestor's content area
      const relX = node.bounds.x - contentX;
      const relY = node.bounds.y - contentY;

      let newScrollX = currentScrollX;
      let newScrollY = currentScrollY;

      // Adjust scrollX so node is within [0, contentW)
      // The visible range is [scrollX, scrollX + contentW)
      // Node occupies [relX, relX + node.bounds.width)
      if (relX < currentScrollX) {
        newScrollX = relX;
      } else if (relX + node.bounds.width > currentScrollX + contentW) {
        newScrollX = relX + node.bounds.width - contentW;
      }

      // Adjust scrollY
      if (relY < currentScrollY) {
        newScrollY = relY;
      } else if (relY + node.bounds.height > currentScrollY + contentH) {
        newScrollY = relY + node.bounds.height - contentH;
      }

      // Clamp to >= 0
      newScrollX = Math.max(0, newScrollX);
      newScrollY = Math.max(0, newScrollY);

      return { scrollX: newScrollX, scrollY: newScrollY };
    }
    current = current.parentId
      ? database.nodes.get(current.parentId)
      : undefined;
  }

  return null;
}

import yoga, { type Node as YogaNode } from "yoga-layout";

import type { NodeProps } from "./types.ts";

export type { YogaNode };

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutNode {
  id: string;
  type: string;
  props: NodeProps;
  parentId: string | null;
  childIds: string[];
  bounds: Bounds | null;
  yogaNode: YogaNode;
}

export interface Database {
  yoga: typeof yoga;
  nodes: Map<string, LayoutNode>;
  rootId: string | null;
  version: number;
  listeners: Set<() => void>;
}

export function createDatabase(): Database {
  return {
    yoga,
    nodes: new Map(),
    rootId: null,
    version: 0,
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

function notifyListeners(database: Database) {
  for (const listener of database.listeners) {
    listener();
  }
}

export function addNode(
  database: Database,
  options: {
    id: string;
    type: string;
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

    node.bounds = { x, y, w, h };

    for (const childId of node.childIds) {
      extractBounds(childId, x, y);
    }
  }

  extractBounds(database.rootId, 0, 0);

  database.version++;
  notifyListeners(database);
}

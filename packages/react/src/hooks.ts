import { useCallback, useSyncExternalStore } from "react";

import {
  type Bounds,
  type Database,
  type EventState,
  type LayoutNode,
  subscribe,
} from "@charui/core";

/**
 * Subscribe to the bounds of a layout node.
 * Returns the node's computed {x, y, w, h} or null if not laid out yet.
 */
export function useBounds(database: Database, nodeId: string): Bounds | null {
  const getSnapshot = useCallback(
    () => database.nodes.get(nodeId)?.bounds ?? null,
    [database, nodeId],
  );

  const subscribeFn = useCallback(
    (onStoreChange: () => void) => subscribe(database, onStoreChange),
    [database],
  );

  return useSyncExternalStore(subscribeFn, getSnapshot, getSnapshot);
}

/**
 * Check whether a specific node is focused.
 */
export function useFocused(eventState: EventState, nodeId: string): boolean {
  return eventState.focusedId === nodeId;
}

/**
 * Get a node by ID from the database.
 */
export function useNode(
  database: Database,
  nodeId: string,
): LayoutNode | undefined {
  const getSnapshot = useCallback(
    () => database.nodes.get(nodeId),
    [database, nodeId],
  );

  const subscribeFn = useCallback(
    (onStoreChange: () => void) => subscribe(database, onStoreChange),
    [database],
  );

  return useSyncExternalStore(subscribeFn, getSnapshot, getSnapshot);
}

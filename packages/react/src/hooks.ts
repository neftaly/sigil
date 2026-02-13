import { useCallback, useSyncExternalStore } from "react";

import { type Bounds, type Database, subscribe } from "@charui/core";

/**
 * Subscribe to the bounds of a layout node.
 * Returns the node's computed bounds or null if not laid out yet.
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

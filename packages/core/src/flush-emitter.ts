import type { Cell } from "./cell.ts";
import type { Database } from "./database.ts";
import type { EventState } from "./events.ts";
import type { OverlayState } from "./overlays.ts";

export interface FlushSnapshot {
  database: Database;
  grid: Cell[][];
  overlayState: OverlayState;
  eventState: EventState;
}

export interface FlushEmitter {
  emit(snapshot: FlushSnapshot): void;
  subscribe(listener: (snapshot: FlushSnapshot) => void): () => void;
}

export function createFlushEmitter(): FlushEmitter {
  const listeners = new Set<(snapshot: FlushSnapshot) => void>();
  let emitting = false;
  let latest: FlushSnapshot | null = null;
  return {
    emit(snapshot) {
      if (emitting) {
        return;
      }
      latest = snapshot;
      emitting = true;
      try {
        for (const listener of [...listeners]) {
          listener(snapshot);
        }
      } finally {
        emitting = false;
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      if (latest) {
        listener(latest);
      }
      return () => listeners.delete(listener);
    },
  };
}

import type { ReactNode } from "react";

import {
  type Cell,
  type Database,
  computeLayout,
  createDatabase,
  gridToString,
  rasterize,
} from "@charui/core";

import { createReconciler } from "./reconciler.ts";

export interface Root {
  render(element: ReactNode): void;
  unmount(): void;
  flushLayout(): void;
  getGrid(): Cell[][];
  toString(): string;
  database: Database;
  width: number;
  height: number;
}

export function createRoot(width: number, height: number): Root {
  const database = createDatabase();
  const reconciler = createReconciler(database);
  const container = reconciler.createContainer(
    database,
    0,
    null,
    false,
    null,
    "",
    () => {},
    () => {},
    () => {},
    () => {},
  );

  let currentGrid: Cell[][] | null = null;

  function flushLayout() {
    computeLayout(database, width, height);
    currentGrid = null;
  }

  function getGrid(): Cell[][] {
    if (!currentGrid) {
      currentGrid = rasterize(database, width, height);
    }
    return currentGrid;
  }

  return {
    render(element: ReactNode) {
      reconciler.updateContainerSync(element, container, null, null);
      reconciler.flushSyncWork();
      flushLayout();
    },

    unmount() {
      reconciler.updateContainerSync(null, container, null, null);
      reconciler.flushSyncWork();
    },

    flushLayout,
    getGrid,

    toString() {
      return gridToString(getGrid());
    },

    database,
    width,
    height,
  };
}

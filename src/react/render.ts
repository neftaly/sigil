import type { ReactNode } from "react";

import {
  type Cell,
  type Database,
  computeLayout,
  createDatabase,
  gridToString,
  rasterize,
} from "../core/index.ts";

import { createReconciler } from "./reconciler.ts";

export interface Root {
  render(element: ReactNode): void;
  unmount(): void;
  resize(width: number, height: number): void;
  flushLayout(): void;
  getGrid(): Cell[][];
  toString(): string;
  database: Database;
  width: number;
  height: number;
}

export function createRoot(
  initialWidth: number,
  initialHeight: number,
): Root {
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
  let _width = initialWidth;
  let _height = initialHeight;

  function flushLayout() {
    computeLayout(database, _width, _height);
    currentGrid = null;
  }

  function getGrid(): Cell[][] {
    if (!currentGrid) {
      currentGrid = rasterize(database, _width, _height);
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

    resize(width: number, height: number) {
      _width = width;
      _height = height;
      flushLayout();
    },

    flushLayout,
    getGrid,

    toString() {
      return gridToString(getGrid());
    },

    database,
    get width() {
      return _width;
    },
    get height() {
      return _height;
    },
  };
}

import { type ReactNode, useMemo } from "react";

import { computeLayout, createDatabase } from "@charui/core";
import { createReconciler } from "@charui/react";

import { ExplodedScene, type FontSet } from "./ExplodedScene.tsx";

export interface ExplodedCanvasProps {
  width: number;
  height: number;
  children: ReactNode;
  fonts?: FontSet;
}

export function ExplodedCanvas({
  width,
  height,
  children,
  fonts,
}: ExplodedCanvasProps) {
  const database = useMemo(() => {
    const db = createDatabase();
    const reconciler = createReconciler(db);
    const container = reconciler.createContainer(
      db,
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
    reconciler.updateContainerSync(children, container, null, null);
    reconciler.flushSyncWork();
    computeLayout(db, width, height);
    return db;
  }, [width, height, children]);

  return <ExplodedScene database={database} fonts={fonts} />;
}

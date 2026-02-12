import {
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type Cell,
  computeLayout,
  createDatabase,
  createEventState,
  rasterize,
} from "@charui/core";
import { createReconciler } from "@charui/react";

import {
  CharuiContext,
  type CharuiContextValue,
  DatabaseReporterContext,
} from "./context.ts";
import { measureCharWidth, renderToDOM } from "./dom.ts";
import { bindInput } from "./input.ts";

export interface CharuiCanvasProps {
  width: number;
  height: number;
  children: ReactNode;
}

/**
 * React component that renders a charui tree into a DOM element.
 * Bridges the charui reconciler with browser rendering.
 */
export function CharuiCanvas({ width, height, children }: CharuiCanvasProps) {
  const reporter = useContext(DatabaseReporterContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ctx] = useState(() => {
    const database = createDatabase();
    const eventState = createEventState();
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
    return { database, eventState, reconciler, container };
  });

  const prevGridRef = useRef<Cell[][] | null>(null);

  const contextValue = useMemo<CharuiContextValue>(
    () => ({ database: ctx.database, eventState: ctx.eventState }),
    [ctx.database, ctx.eventState],
  );

  const flush = useCallback(() => {
    computeLayout(ctx.database, width, height);
    const grid = rasterize(ctx.database, width, height);
    if (containerRef.current) {
      renderToDOM(containerRef.current, grid, prevGridRef.current);
    }
    prevGridRef.current = grid;
    return grid;
  }, [ctx.database, width, height]);

  // Render charui tree
  useEffect(() => {
    ctx.reconciler.updateContainerSync(children, ctx.container, null, null);
    ctx.reconciler.flushSyncWork();
    const grid = flush();
    reporter?.report(ctx.database, grid);
  }, [children, ctx, flush, reporter]);

  // Bind input events
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const cellWidth = measureCharWidth(containerRef.current);
    const bindings = bindInput(
      containerRef.current,
      ctx.database,
      ctx.eventState,
      cellWidth,
    );
    return () => {
      bindings.dispose();
    };
  }, [ctx.database, ctx.eventState]);

  return (
    <CharuiContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        style={{
          fontFamily: "inherit",
          fontSize: "14px",
          lineHeight: "1",
          whiteSpace: "pre",
          cursor: "default",
          userSelect: "none",
        }}
      />
    </CharuiContext.Provider>
  );
}

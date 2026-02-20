import {
  type ReactNode,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type Cell,
  type FlushEmitter,
  applyOverlays,
  computeLayout,
  createDatabase,
  createEventState,
  createOverlayState,
  rasterize,
} from "../core/index.ts";
import { CanvasContext, createReconciler } from "../react/index.ts";

import {
  CharuiContext,
  type CharuiContextValue,
  FlushEmitterContext,
} from "./context.ts";
import type { AriaManager } from "./aria.ts";
import { createAriaManager } from "./aria.ts";
import { measureCharWidth, renderToDOM, syncSelectionToDOM } from "./dom.ts";
import { bindInput } from "./input-binding.ts";

export interface CharuiCanvasProps {
  width: number;
  height: number;
  children: ReactNode;
  flushEmitter?: FlushEmitter;
}

/**
 * React component that renders a charui tree into a DOM element.
 * Bridges the charui reconciler with browser rendering.
 */
let selectionStyleInjected = false;
function ensureSelectionStyle() {
  if (selectionStyleInjected) {
    return;
  }
  selectionStyleInjected = true;
  const style = document.createElement("style");
  style.textContent =
    ".charui-canvas ::selection { background: Highlight; color: HighlightText; }";
  document.head.appendChild(style);
}

export function CharuiCanvas({
  width,
  height,
  children,
  flushEmitter: flushEmitterProp,
}: CharuiCanvasProps) {
  const flushEmitterCtx = useContext(FlushEmitterContext);
  const flushEmitter = flushEmitterProp ?? flushEmitterCtx;
  const containerRef = useRef<HTMLDivElement>(null);
  const flushRef = useRef<(() => Cell[][]) | null>(null);
  const flushEmitterRef = useRef(flushEmitter);
  flushEmitterRef.current = flushEmitter;
  // Flag to suppress onCommit flush when the useEffect is driving the render
  const suppressFlushRef = useRef(false);

  const [ctx] = useState(() => {
    const database = createDatabase();
    const eventState = createEventState();
    const overlayState = createOverlayState();
    const reconciler = createReconciler(database, {
      onCommit() {
        // Skip if the useEffect is driving this commit (it flushes afterwards)
        if (suppressFlushRef.current) {
          return;
        }
        // Internal state update (e.g. from pointer handler) — flush to DOM
        const fn = flushRef.current;
        if (fn) {
          const grid = fn();
          flushEmitterRef.current?.emit({
            database,
            grid,
            overlayState,
            eventState,
          });
        }
      },
    });
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
    return { database, eventState, overlayState, reconciler, container };
  });

  const prevGridRef = useRef<Cell[][] | null>(null);
  const bindingsRef = useRef<ReturnType<typeof bindInput> | null>(null);
  const ariaManagerRef = useRef<AriaManager | null>(null);
  const cellDimsRef = useRef<{ cellWidth: number; cellHeight: number } | null>(
    null,
  );

  const contextValue = useMemo<CharuiContextValue>(
    () => ({
      database: ctx.database,
      eventState: ctx.eventState,
      overlayState: ctx.overlayState,
    }),
    [ctx.database, ctx.eventState, ctx.overlayState],
  );

  const syncValue = useMemo(
    () => ({
      sync(text: string, selectionStart: number, selectionEnd: number) {
        bindingsRef.current?.sync(text, selectionStart, selectionEnd);
      },
    }),
    [],
  );

  const flush = useCallback(() => {
    computeLayout(ctx.database, width, height);
    const grid = rasterize(ctx.database, width, height);
    const overlaid = applyOverlays(grid, ctx.overlayState);
    if (containerRef.current) {
      renderToDOM(containerRef.current, overlaid, prevGridRef.current);
      syncSelectionToDOM(containerRef.current, ctx.overlayState);
      if (ariaManagerRef.current && cellDimsRef.current) {
        ariaManagerRef.current.sync(
          ctx.database,
          cellDimsRef.current.cellWidth,
          cellDimsRef.current.cellHeight,
        );
      }
    }
    prevGridRef.current = overlaid;
    return overlaid;
  }, [ctx.database, ctx.overlayState, width, height]);

  // Keep flushRef in sync so onCommit can call it
  flushRef.current = flush;

  const canvasContextValue = useMemo(
    () => ({
      eventState: ctx.eventState,
      overlayState: ctx.overlayState,
      editContextSync: syncValue,
    }),
    [ctx.eventState, ctx.overlayState, syncValue],
  );

  // Render charui tree
  useEffect(() => {
    const wrapped = createElement(
      CanvasContext.Provider,
      { value: canvasContextValue },
      children,
    );
    suppressFlushRef.current = true;
    ctx.reconciler.updateContainerSync(wrapped, ctx.container, null, null);
    ctx.reconciler.flushSyncWork();
    suppressFlushRef.current = false;
    const grid = flush();
    flushEmitter?.emit({
      database: ctx.database,
      grid,
      overlayState: ctx.overlayState,
      eventState: ctx.eventState,
    });
  }, [children, ctx, canvasContextValue, flush, flushEmitter]);

  // Bind input events and create ARIA manager
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    ensureSelectionStyle();
    const cellWidth = measureCharWidth(containerRef.current);
    const lineHeight = parseFloat(getComputedStyle(containerRef.current).lineHeight) || 14;
    cellDimsRef.current = { cellWidth, cellHeight: lineHeight };
    const bindings = bindInput(
      containerRef.current,
      ctx.database,
      ctx.eventState,
      cellWidth,
    );
    bindingsRef.current = bindings;
    const ariaManager = createAriaManager(containerRef.current);
    ariaManagerRef.current = ariaManager;
    return () => {
      bindings.dispose();
      bindingsRef.current = null;
      ariaManager.dispose();
      ariaManagerRef.current = null;
      cellDimsRef.current = null;
    };
  }, [ctx.database, ctx.eventState]);

  return (
    <CharuiContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        className="charui-canvas"
        style={{
          position: "relative",
          fontFamily: "inherit",
          fontSize: "14px",
          lineHeight: "normal",
          whiteSpace: "pre",
          cursor: "default",
          outline: "none",
          caretColor: "transparent",
        }}
      />
    </CharuiContext.Provider>
  );
}

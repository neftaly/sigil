import { type RefObject, useCallback, useRef, useState } from "react";

import {
  type EventState,
  type LayoutNode,
  type PointerEvent,
  releasePointerCapture,
  setPointerCapture,
} from "@charui/core";

export interface ResizeState {
  isResizing: boolean;
  width: number;
  height: number;
  handlers: {
    onPointerDown: (event: PointerEvent) => void;
    onPointerMove: (event: PointerEvent) => void;
    onPointerUp: (event: PointerEvent) => void;
    onPointerCancel: (event: PointerEvent) => void;
  };
}

export interface UseResizeOptions {
  eventState: EventState;
  nodeRef: RefObject<LayoutNode | null>;
  initialWidth: number;
  initialHeight: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  onResize?: (size: { width: number; height: number }) => void;
}

export function useResize(options: UseResizeOptions): ResizeState {
  const {
    eventState,
    nodeRef,
    initialWidth,
    initialHeight,
    minWidth = 1,
    minHeight = 1,
    maxWidth = Infinity,
    maxHeight = Infinity,
    onResize,
  } = options;

  const [size, setSize] = useState({
    width: initialWidth,
    height: initialHeight,
  });

  // Use refs for state read by event handlers to avoid stale closures.
  // React batches state updates, so DOM events can fire before the
  // Reconciler commits new props with updated callbacks.
  const resizingRef = useRef(false);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const startRef = useRef({ col: 0, row: 0, width: 0, height: 0 });

  const onPointerDown = useCallback(
    (event: PointerEvent) => {
      const id = nodeRef.current?.id;
      if (!id) {
        return;
      }
      startRef.current = {
        col: event.col,
        row: event.row,
        width: sizeRef.current.width,
        height: sizeRef.current.height,
      };
      resizingRef.current = true;
      setPointerCapture(eventState, id);
    },
    [eventState, nodeRef],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!resizingRef.current) {
        return;
      }
      const deltaCol = event.col - startRef.current.col;
      const deltaRow = event.row - startRef.current.row;
      const newWidth = Math.min(
        maxWidth,
        Math.max(minWidth, startRef.current.width + deltaCol),
      );
      const newHeight = Math.min(
        maxHeight,
        Math.max(minHeight, startRef.current.height + deltaRow),
      );
      const newSize = { width: newWidth, height: newHeight };
      setSize(newSize);
      onResize?.(newSize);
    },
    [minWidth, minHeight, maxWidth, maxHeight, onResize],
  );

  const onPointerUp = useCallback(() => {
    if (!resizingRef.current) {
      return;
    }
    resizingRef.current = false;
    releasePointerCapture(eventState);
  }, [eventState]);

  const onPointerCancel = useCallback(() => {
    if (!resizingRef.current) {
      return;
    }
    resizingRef.current = false;
    const rollback = {
      width: startRef.current.width,
      height: startRef.current.height,
    };
    setSize(rollback);
    releasePointerCapture(eventState);
    onResize?.(rollback);
  }, [eventState, onResize]);

  return {
    isResizing: resizingRef.current,
    width: size.width,
    height: size.height,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}

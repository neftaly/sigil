import { useCallback, useRef, useState } from "react";

import {
  type EventState,
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
  };
}

export interface UseResizeOptions {
  eventState: EventState;
  nodeId: string;
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
    nodeId,
    initialWidth,
    initialHeight,
    minWidth = 1,
    minHeight = 1,
    maxWidth = Infinity,
    maxHeight = Infinity,
    onResize,
  } = options;

  const [isResizing, setIsResizing] = useState(false);
  const [size, setSize] = useState({
    width: initialWidth,
    height: initialHeight,
  });
  const startRef = useRef({ col: 0, row: 0, width: 0, height: 0 });

  const onPointerDown = useCallback(
    (event: PointerEvent) => {
      startRef.current = {
        col: event.col,
        row: event.row,
        width: size.width,
        height: size.height,
      };
      setIsResizing(true);
      setPointerCapture(eventState, nodeId);
    },
    [eventState, nodeId, size],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!isResizing) {
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
    [isResizing, minWidth, minHeight, maxWidth, maxHeight, onResize],
  );

  const onPointerUp = useCallback(() => {
    if (!isResizing) {
      return;
    }
    setIsResizing(false);
    releasePointerCapture(eventState);
  }, [isResizing, eventState]);

  return {
    isResizing,
    width: size.width,
    height: size.height,
    handlers: { onPointerDown, onPointerMove, onPointerUp },
  };
}

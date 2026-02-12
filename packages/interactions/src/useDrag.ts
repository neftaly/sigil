import { useCallback, useRef, useState } from "react";

import {
  type EventState,
  type PointerEvent,
  releasePointerCapture,
  setPointerCapture,
} from "@charui/core";

export interface DragState {
  isDragging: boolean;
  deltaCol: number;
  deltaRow: number;
  handlers: {
    onPointerDown: (event: PointerEvent) => void;
    onPointerMove: (event: PointerEvent) => void;
    onPointerUp: (event: PointerEvent) => void;
  };
}

export interface UseDragOptions {
  eventState: EventState;
  nodeId: string;
  onDrag?: (delta: { col: number; row: number }) => void;
  onDragEnd?: (delta: { col: number; row: number }) => void;
}

export function useDrag(options: UseDragOptions): DragState {
  const { eventState, nodeId, onDrag, onDragEnd } = options;
  const [isDragging, setIsDragging] = useState(false);
  const [delta, setDelta] = useState({ col: 0, row: 0 });
  const startRef = useRef({ col: 0, row: 0 });

  const onPointerDown = useCallback(
    (event: PointerEvent) => {
      startRef.current = { col: event.col, row: event.row };
      setIsDragging(true);
      setDelta({ col: 0, row: 0 });
      setPointerCapture(eventState, nodeId);
    },
    [eventState, nodeId],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!isDragging) {
        return;
      }
      const newDelta = {
        col: event.col - startRef.current.col,
        row: event.row - startRef.current.row,
      };
      setDelta(newDelta);
      onDrag?.(newDelta);
    },
    [isDragging, onDrag],
  );

  const onPointerUp = useCallback(
    (event: PointerEvent) => {
      if (!isDragging) {
        return;
      }
      const finalDelta = {
        col: event.col - startRef.current.col,
        row: event.row - startRef.current.row,
      };
      setIsDragging(false);
      setDelta({ col: 0, row: 0 });
      releasePointerCapture(eventState);
      onDragEnd?.(finalDelta);
    },
    [isDragging, eventState, onDragEnd],
  );

  return {
    isDragging,
    deltaCol: delta.col,
    deltaRow: delta.row,
    handlers: { onPointerDown, onPointerMove, onPointerUp },
  };
}

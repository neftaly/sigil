import { type RefObject, useCallback, useRef, useState } from "react";

import {
  type EventState,
  type LayoutNode,
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
    onPointerCancel: (event: PointerEvent) => void;
  };
}

export interface UseDragOptions {
  eventState: EventState;
  nodeRef: RefObject<LayoutNode | null>;
  onDrag?: (delta: { col: number; row: number }) => void;
  onDragEnd?: (delta: { col: number; row: number }) => void;
}

export function useDrag(options: UseDragOptions): DragState {
  const { eventState, nodeRef, onDrag, onDragEnd } = options;
  const [delta, setDelta] = useState({ col: 0, row: 0 });
  const draggingRef = useRef(false);
  const startRef = useRef({ col: 0, row: 0 });

  const onPointerDown = useCallback(
    (event: PointerEvent) => {
      const id = nodeRef.current?.id;
      if (!id) {
        return;
      }
      startRef.current = { col: event.col, row: event.row };
      draggingRef.current = true;
      setDelta({ col: 0, row: 0 });
      setPointerCapture(eventState, id);
    },
    [eventState, nodeRef],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!draggingRef.current) {
        return;
      }
      const newDelta = {
        col: event.col - startRef.current.col,
        row: event.row - startRef.current.row,
      };
      setDelta(newDelta);
      onDrag?.(newDelta);
    },
    [onDrag],
  );

  const onPointerUp = useCallback(
    (event: PointerEvent) => {
      if (!draggingRef.current) {
        return;
      }
      const finalDelta = {
        col: event.col - startRef.current.col,
        row: event.row - startRef.current.row,
      };
      draggingRef.current = false;
      setDelta({ col: 0, row: 0 });
      releasePointerCapture(eventState);
      onDragEnd?.(finalDelta);
    },
    [eventState, onDragEnd],
  );

  const onPointerCancel = useCallback(() => {
    if (!draggingRef.current) {
      return;
    }
    draggingRef.current = false;
    setDelta({ col: 0, row: 0 });
    releasePointerCapture(eventState);
  }, [eventState]);

  return {
    isDragging: draggingRef.current,
    deltaCol: delta.col,
    deltaRow: delta.row,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}

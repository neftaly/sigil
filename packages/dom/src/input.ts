import {
  type PointerEvent as CharuiPointerEvent,
  type Database,
  type EventState,
  type KeyEvent,
  dispatchKeyEvent,
  dispatchPointerEvent,
  findFocusable,
  hitTest,
  releasePointerCapture,
  setFocus,
} from "@charui/core";

import { pixelToGrid } from "./dom.ts";

export interface InputBindings {
  dispose: () => void;
}

/**
 * Bind DOM mouse and keyboard events to the charui event system.
 * cellWidth is the measured width of a single monospace character.
 * Returns a dispose function to remove all listeners.
 */
export function bindInput(
  container: HTMLElement,
  database: Database,
  eventState: EventState,
  cellWidth: number,
): InputBindings {
  let activeDomPointerId: number | null = null;

  function handlePointerEvent(
    domEvent: PointerEvent,
    type: CharuiPointerEvent["type"],
  ) {
    const coords = pixelToGrid(
      container,
      domEvent.clientX,
      domEvent.clientY,
      cellWidth,
    );
    if (!coords) {
      return;
    }

    const event: CharuiPointerEvent = {
      type,
      col: coords.col,
      row: coords.row,
      button: domEvent.button,
    };

    // On pointerdown, focus the hit node (or nearest focusable descendant)
    if (type === "pointerdown") {
      const target = hitTest(database, coords.col, coords.row);
      if (target) {
        const focusTarget = target.props.focusable
          ? target
          : findFocusable(database, target.id);
        if (focusTarget) {
          setFocus(database, eventState, focusTarget.id);
        }
      }
    }

    dispatchPointerEvent(database, eventState, event);

    // DOM pointer capture follows charui capture:
    // If a handler called setPointerCapture during pointerdown, mirror to DOM.
    if (type === "pointerdown" && eventState.capturedNodeId) {
      container.setPointerCapture(domEvent.pointerId);
      activeDomPointerId = domEvent.pointerId;
    }

    // On pointerup, release both charui and DOM pointer capture
    if (type === "pointerup") {
      if (eventState.capturedNodeId) {
        releasePointerCapture(eventState);
      }
      if (activeDomPointerId !== null) {
        container.releasePointerCapture(activeDomPointerId);
        activeDomPointerId = null;
      }
    }

    // Update cursor based on hovered node
    if (type === "pointermove" || type === "pointerdown") {
      const hovered = eventState.hoveredNodeId
        ? database.nodes.get(eventState.hoveredNodeId)
        : null;
      const cursorStyle = hovered?.props.cursor ?? "default";
      container.style.cursor = cursorStyle;
    }
  }

  function handleKeyEvent(domEvent: KeyboardEvent, type: KeyEvent["type"]) {
    const event: KeyEvent = {
      type,
      key: domEvent.key,
      code: domEvent.code,
      ctrlKey: domEvent.ctrlKey,
      shiftKey: domEvent.shiftKey,
      altKey: domEvent.altKey,
      metaKey: domEvent.metaKey,
    };
    dispatchKeyEvent(database, eventState, event);
  }

  const onPointerDown = (e: PointerEvent) => {
    handlePointerEvent(e, "pointerdown");
  };
  const onPointerUp = (e: PointerEvent) => {
    handlePointerEvent(e, "pointerup");
  };
  const onPointerMove = (e: PointerEvent) => {
    handlePointerEvent(e, "pointermove");
  };
  const onKeyDown = (e: KeyboardEvent) => {
    handleKeyEvent(e, "keydown");
  };
  const onKeyUp = (e: KeyboardEvent) => {
    handleKeyEvent(e, "keyup");
  };

  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("pointerup", onPointerUp);
  container.addEventListener("pointermove", onPointerMove);
  container.addEventListener("keydown", onKeyDown);
  container.addEventListener("keyup", onKeyUp);

  // Make container focusable for keyboard events
  if (!container.hasAttribute("tabindex")) {
    container.setAttribute("tabindex", "0");
  }

  return {
    dispose() {
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("keydown", onKeyDown);
      container.removeEventListener("keyup", onKeyUp);
    },
  };
}

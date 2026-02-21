/// <reference path="./editcontext.d.ts" />
import "@neftaly/editcontext-polyfill";

import {
  type PointerEvent as CharuiPointerEvent,
  type TextUpdateEvent as CharuiTextUpdateEvent,
  type Database,
  type EventState,
  type KeyEvent,
  dispatchKeyEvent,
  dispatchPointerEvent,
  dispatchTextUpdateEvent,
  focusAndDispatch,
  isNavigationKey,
  clearPointerCapture,
} from "../core/index.ts";

import { pixelToGrid } from "./dom.ts";

export interface InputBindings {
  dispose: () => void;
  sync: (text: string, selectionStart: number, selectionEnd: number) => void;
}

/**
 * Bind DOM mouse, keyboard, and EditContext events to the charui event system.
 * cellWidth is the measured width of a single monospace character.
 * Returns dispose function and sync function for pushing state to EditContext.
 */
export function bindInput(
  container: HTMLElement,
  database: Database,
  eventState: EventState,
  cellWidth: number,
): InputBindings {
  let capturedDomPointerId: number | null = null;

  // --- EditContext setup ---
  const editContext = new EditContext({
    text: "",
    selectionStart: 0,
    selectionEnd: 0,
  });
  container.editContext = editContext;

  function handleTextUpdate(e: Event) {
    const textEvent = e as TextUpdateEvent;
    const event: CharuiTextUpdateEvent = {
      type: "textupdate",
      text: textEvent.text,
      updateRangeStart: textEvent.updateRangeStart,
      updateRangeEnd: textEvent.updateRangeEnd,
      selectionStart: textEvent.selectionStart,
      selectionEnd: textEvent.selectionEnd,
    };
    dispatchTextUpdateEvent(database, eventState, event);
  }

  function handleCharacterBoundsUpdate(e: Event) {
    const boundsEvent = e as CharacterBoundsUpdateEvent;
    const rect = container.getBoundingClientRect();
    const rowCount = container.children.length;
    if (rowCount === 0) {
      return;
    }
    const cellHeight = rect.height / rowCount;

    // Get the focused node's bounds to compute character positions
    const focusedNode = eventState.focusedId
      ? database.nodes.get(eventState.focusedId)
      : null;
    if (!focusedNode?.bounds) {
      return;
    }

    const bounds: DOMRect[] = [];
    for (let i = boundsEvent.rangeStart; i < boundsEvent.rangeEnd; i++) {
      const col = focusedNode.bounds.x + i;
      const row = focusedNode.bounds.y;
      bounds.push(
        new DOMRect(
          rect.left + col * cellWidth,
          rect.top + row * cellHeight,
          cellWidth,
          cellHeight,
        ),
      );
    }
    editContext.updateCharacterBounds(boundsEvent.rangeStart, bounds);
  }

  editContext.addEventListener("textupdate", handleTextUpdate);
  editContext.addEventListener(
    "characterboundsupdate",
    handleCharacterBoundsUpdate,
  );

  // --- Pointer events (unchanged) ---

  function handlePointerEvent(
    domEvent: PointerEvent,
    type: CharuiPointerEvent["type"],
  ) {
    let coords = pixelToGrid(
      container,
      domEvent.clientX,
      domEvent.clientY,
      cellWidth,
    );

    // During capture, clamp out-of-bounds coords to grid edge
    if (!coords && eventState.capturedNodeId) {
      const rect = container.getBoundingClientRect();
      const rowCount = container.children.length;
      if (rowCount === 0) {
        return;
      }
      const cellHeight = rect.height / rowCount;
      const colCount = Math.floor(rect.width / cellWidth);
      coords = {
        col: Math.max(
          0,
          Math.min(
            colCount - 1,
            Math.floor((domEvent.clientX - rect.left) / cellWidth),
          ),
        ),
        row: Math.max(
          0,
          Math.min(
            rowCount - 1,
            Math.floor((domEvent.clientY - rect.top) / cellHeight),
          ),
        ),
      };
    }

    if (!coords) {
      return;
    }

    const event: CharuiPointerEvent = {
      type,
      col: coords.col,
      row: coords.row,
      button: domEvent.button,
      shiftKey: domEvent.shiftKey,
    };

    if (type === "pointerdown") {
      container.focus();
      focusAndDispatch(database, eventState, event);
    } else {
      dispatchPointerEvent(database, eventState, event);
    }

    // DOM pointer capture follows charui capture
    if (type === "pointerdown" && eventState.capturedNodeId) {
      container.setPointerCapture(domEvent.pointerId);
      capturedDomPointerId = domEvent.pointerId;
    }

    if (type === "pointerup" || type === "pointercancel") {
      if (eventState.capturedNodeId) {
        clearPointerCapture(eventState);
      }
      if (capturedDomPointerId !== null) {
        container.releasePointerCapture(capturedDomPointerId);
        capturedDomPointerId = null;
      }
    }

    // Update cursor based on hovered node (walk ancestors for inheritance)
    if (type === "pointermove" || type === "pointerdown") {
      let cursorStyle = "default";
      let node = eventState.hoveredNodeId
        ? database.nodes.get(eventState.hoveredNodeId)
        : undefined;
      while (node) {
        if (node.props.cursor) {
          cursorStyle = node.props.cursor;
          break;
        }
        node = node.parentId ? database.nodes.get(node.parentId) : undefined;
      }
      container.style.cursor = cursorStyle;
    }
  }

  // --- Keyboard events (navigation keys only) ---

  function handleKeyEvent(domEvent: KeyboardEvent, type: KeyEvent["type"]) {
    if (!isNavigationKey(domEvent.key)) {
      return;
    }
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
  const onCancelCapture = (e: PointerEvent) => {
    if (eventState.capturedNodeId) {
      handlePointerEvent(e, "pointercancel");
    }
  };
  const onKeyDown = (e: KeyboardEvent) => {
    handleKeyEvent(e, "keydown");
  };
  const onKeyUp = (e: KeyboardEvent) => {
    handleKeyEvent(e, "keyup");
  };

  const onSelectStart = (e: Event) => {
    if (eventState.capturedNodeId) {
      e.preventDefault();
    }
  };

  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("pointerup", onPointerUp);
  container.addEventListener("pointermove", onPointerMove);
  container.addEventListener("pointercancel", onCancelCapture);
  container.addEventListener("lostpointercapture", onCancelCapture);
  container.addEventListener("keydown", onKeyDown);
  container.addEventListener("keyup", onKeyUp);
  container.addEventListener("selectstart", onSelectStart);

  // Make container focusable for keyboard events
  if (!container.hasAttribute("tabindex")) {
    container.setAttribute("tabindex", "0");
  }

  return {
    dispose() {
      editContext.removeEventListener("textupdate", handleTextUpdate);
      editContext.removeEventListener(
        "characterboundsupdate",
        handleCharacterBoundsUpdate,
      );
      container.editContext = null;
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointercancel", onCancelCapture);
      container.removeEventListener("lostpointercapture", onCancelCapture);
      container.removeEventListener("keydown", onKeyDown);
      container.removeEventListener("keyup", onKeyUp);
      container.removeEventListener("selectstart", onSelectStart);
    },
    sync(text: string, selectionStart: number, selectionEnd: number) {
      editContext.updateText(0, editContext.text.length, text);
      editContext.updateSelection(selectionStart, selectionEnd);

      // Update control bounds (whole container) and selection bounds (caret position)
      const rect = container.getBoundingClientRect();
      editContext.updateControlBounds(rect);

      const focusedNode = eventState.focusedId
        ? database.nodes.get(eventState.focusedId)
        : null;
      if (focusedNode?.bounds) {
        const rowCount = container.children.length;
        if (rowCount > 0) {
          const cellHeight = rect.height / rowCount;
          const col = focusedNode.bounds.x + selectionStart;
          const row = focusedNode.bounds.y;
          editContext.updateSelectionBounds(
            new DOMRect(
              rect.left + col * cellWidth,
              rect.top + row * cellHeight,
              cellWidth,
              cellHeight,
            ),
          );
        }
      }
    },
  };
}

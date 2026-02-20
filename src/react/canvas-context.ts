import { createContext, useContext } from "react";

import type { EventState, OverlayState } from "../core/index.ts";

export interface EditContextSync {
  sync(text: string, selectionStart: number, selectionEnd: number): void;
}

export interface CanvasContextValue {
  eventState: EventState;
  overlayState: OverlayState;
  editContextSync: EditContextSync | null;
}

export const CanvasContext = createContext<CanvasContextValue | null>(null);

export function useCanvasContext(): CanvasContextValue {
  const ctx = useContext(CanvasContext);
  if (!ctx) {
    throw new Error(
      "useCanvasContext must be used within a CanvasContext.Provider",
    );
  }
  return ctx;
}

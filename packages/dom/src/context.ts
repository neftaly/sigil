import { createContext, useContext } from "react";

import type {
  Database,
  EventState,
  FlushEmitter,
  OverlayState,
} from "@charui/core";

export interface CharuiContextValue {
  database: Database;
  eventState: EventState;
  overlayState: OverlayState;
}

export const CharuiContext = createContext<CharuiContextValue | null>(null);

export function useCharui(): CharuiContextValue {
  const ctx = useContext(CharuiContext);
  if (!ctx) {
    throw new Error("useCharui must be used within a <CharuiCanvas>");
  }
  return ctx;
}

export const FlushEmitterContext = createContext<FlushEmitter | null>(null);

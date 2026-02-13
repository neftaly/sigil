import { createContext } from "react";

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

export const FlushEmitterContext = createContext<FlushEmitter | null>(null);

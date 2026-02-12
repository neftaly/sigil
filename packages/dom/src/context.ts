import { createContext, useContext } from "react";

import type { Cell, Database, EventState } from "@charui/core";

export interface CharuiContextValue {
  database: Database;
  eventState: EventState;
}

export const CharuiContext = createContext<CharuiContextValue | null>(null);

export function useCharui(): CharuiContextValue {
  const ctx = useContext(CharuiContext);
  if (!ctx) {
    throw new Error("useCharui must be used within a <CharuiCanvas>");
  }
  return ctx;
}

export interface DatabaseReporterValue {
  report(database: Database, grid: Cell[][]): void;
}

export const DatabaseReporterContext =
  createContext<DatabaseReporterValue | null>(null);

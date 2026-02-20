import { type ReactNode, createContext, createElement, useContext, useMemo } from "react";

import type { BorderStyle } from "../core/index.ts";

export interface Theme {
  colors: {
    text: string;
    textDim: string;
    primary: string;
    border: string;
    focusBorder: string;
    error: string;
    filled: string;
    empty: string;
  };
  borders: {
    default: BorderStyle;
    focused: BorderStyle;
  };
}

export const defaultTheme: Theme = {
  colors: {
    text: "#ffffff",
    textDim: "#888888",
    primary: "#00ff88",
    border: "#444444",
    focusBorder: "#00ff88",
    error: "#ff3333",
    filled: "#00ff88",
    empty: "#333333",
  },
  borders: {
    default: "single",
    focused: "round",
  },
};

const ThemeContext = createContext<Theme>(defaultTheme);

export interface ThemeProviderProps {
  theme?: Partial<Theme>;
  children: ReactNode;
}

/** Deep merges a partial theme with the default theme. */
function mergeTheme(base: Theme, overrides: Partial<Theme>): Theme {
  return {
    colors: {
      ...base.colors,
      ...overrides.colors,
    },
    borders: {
      ...base.borders,
      ...overrides.borders,
    },
  };
}

/**
 * Provides a theme context to all descendants. Accepts a partial theme
 * that is deep-merged with the default theme.
 */
export function ThemeProvider({ theme, children }: ThemeProviderProps): ReactNode {
  const merged = useMemo(
    () => (theme ? mergeTheme(defaultTheme, theme) : defaultTheme),
    [theme],
  );

  return createElement(ThemeContext.Provider, { value: merged }, children);
}

/** Returns the current theme from the nearest ThemeProvider. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}

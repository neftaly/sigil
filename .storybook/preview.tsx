import React, { useEffect, useRef, useState } from "react";
import type { Preview } from "@storybook/react";
import {
  type Cell,
  type PointerEvent as CharuiPointerEvent,
  type Database,
  type EventState,
  type FlushSnapshot,
  type OverlayState,
  createFlushEmitter,
  dispatchPointerEvent,
  focusAndDispatch,
  releasePointerCapture,
} from "../src/core/index.ts";
import { FlushEmitterContext } from "../src/dom/index.ts";
import {
  parseSGRMouse,
  syncSelectionToTerminal,
  toAnsi,
} from "../src/terminal/index.ts";
import { ExplodedScene, type FontSet } from "../src/threedee/index.ts";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

const xtermStyle = document.createElement("style");
xtermStyle.textContent = ".xterm-viewport { scrollbar-width: none; }";
document.head.appendChild(xtermStyle);

interface FontConfig {
  family: string;
  fonts: FontSet;
}

const FONTS: Record<string, FontConfig> = {
  hack: {
    family: "'Hack', monospace",
    fonts: {
      regular: new URL("./fonts/hack/Hack-Regular.ttf", import.meta.url).href,
      bold: new URL("./fonts/hack/Hack-Bold.ttf", import.meta.url).href,
      italic: new URL("./fonts/hack/Hack-Italic.ttf", import.meta.url).href,
      boldItalic: new URL("./fonts/hack/Hack-BoldItalic.ttf", import.meta.url)
        .href,
    },
  },
  "ibm-plex-mono": {
    family: "'IBM Plex Mono', monospace",
    fonts: {
      regular: new URL(
        "./fonts/ibm-plex-mono/IBMPlexMono-Regular.ttf",
        import.meta.url,
      ).href,
      bold: new URL(
        "./fonts/ibm-plex-mono/IBMPlexMono-Bold.ttf",
        import.meta.url,
      ).href,
      italic: new URL(
        "./fonts/ibm-plex-mono/IBMPlexMono-Italic.ttf",
        import.meta.url,
      ).href,
      boldItalic: new URL(
        "./fonts/ibm-plex-mono/IBMPlexMono-BoldItalic.ttf",
        import.meta.url,
      ).href,
    },
  },
  iosevka: {
    family: "'Iosevka', monospace",
    fonts: {
      regular: new URL("./fonts/iosevka/Iosevka-Regular.ttf", import.meta.url)
        .href,
      bold: new URL("./fonts/iosevka/Iosevka-Bold.ttf", import.meta.url).href,
      italic: new URL("./fonts/iosevka/Iosevka-Italic.ttf", import.meta.url)
        .href,
      boldItalic: new URL(
        "./fonts/iosevka/Iosevka-BoldItalic.ttf",
        import.meta.url,
      ).href,
    },
  },
};

async function loadFontFaces(fontKey: string): Promise<void> {
  const config = FONTS[fontKey];
  if (!config) {
    return;
  }
  const [, name] = config.family.split("'");
  const faces = [
    new FontFace(name, `url(${config.fonts.regular})`, {
      weight: "400",
      style: "normal",
    }),
    new FontFace(name, `url(${config.fonts.bold})`, {
      weight: "700",
      style: "normal",
    }),
    new FontFace(name, `url(${config.fonts.italic})`, {
      weight: "400",
      style: "italic",
    }),
    new FontFace(name, `url(${config.fonts.boldItalic})`, {
      weight: "700",
      style: "italic",
    }),
  ];
  const loaded = await Promise.all(faces.map((f) => f.load()));
  for (const face of loaded) {
    document.fonts.add(face);
  }
}

// Pre-load the default font
await loadFontFaces("hack");

function useIsWide(breakpoint = 900): boolean {
  const [isWide, setIsWide] = useState(
    () => window.matchMedia(`(min-width: ${breakpoint}px)`).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);
  return isWide;
}

function TerminalPane({
  grid,
  overlayState,
  database,
  eventState,
  fontFamily,
}: {
  grid: Cell[][] | null;
  overlayState: OverlayState | null;
  database: Database | null;
  eventState: EventState | null;
  fontFamily: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const dbRef = useRef(database);
  const esRef = useRef(eventState);
  dbRef.current = database;
  esRef.current = eventState;

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const term = new Terminal({
      fontSize: 14,
      fontFamily,
      cursorStyle: "bar",
      cursorBlink: false,
      allowTransparency: true,
      theme: {
        background: "#00000000",
      },
    });
    term.open(containerRef.current);
    termRef.current = term;

    // Enable SGR extended mouse reporting (any-event tracking)
    // Hide native xterm cursor (charui renders its own via overlay inversions)
    term.write("\x1b[?1003h\x1b[?1006h\x1b[?25l");

    const dataDisposable = term.onData((data) => {
      const db = dbRef.current;
      const es = esRef.current;
      if (!db || !es) {
        return;
      }

      const mouse = parseSGRMouse(data);
      if (!mouse) {
        return;
      }

      const event: CharuiPointerEvent = {
        type: mouse.type,
        col: mouse.col,
        row: mouse.row,
        button: mouse.button,
        shiftKey: false,
      };

      if (mouse.type === "pointerdown") {
        // Guard: release stale capture from a missed pointerup
        if (es.capturedNodeId) {
          releasePointerCapture(es);
        }
        focusAndDispatch(db, es, event);
      } else {
        dispatchPointerEvent(db, es, event);
      }

      if (
        (mouse.type === "pointerup" || mouse.type === "pointercancel") &&
        es.capturedNodeId
      ) {
        releasePointerCapture(es);
      }
    });

    return () => {
      dataDisposable.dispose();
      term.dispose();
      termRef.current = null;
    };
  }, [fontFamily]);

  useEffect(() => {
    if (!termRef.current || !grid) {
      return;
    }
    const cols = grid[0]?.length ?? 80;
    const rows = grid.length;
    termRef.current.resize(cols, rows);
    // Move cursor to top-left and overwrite in place (no reset to avoid flicker)
    termRef.current.write(`\x1b[H${toAnsi(grid)}`);
    syncSelectionToTerminal(termRef.current, overlayState);
  }, [grid, overlayState]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div ref={containerRef} />
    </div>
  );
}

function ThreeDeePane({
  db,
  overlayState,
  fonts,
  flatten,
}: {
  db: Database | null;
  overlayState: OverlayState | null;
  fonts: FontSet;
  flatten: boolean;
}) {
  if (!db) {
    return (
      <div
        style={{
          color: "#666",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        No charui scene detected
      </div>
    );
  }
  return (
    <ExplodedScene
      database={db}
      overlayState={overlayState ?? undefined}
      fonts={fonts}
      flatten={flatten}
    />
  );
}

function TriPaneDecorator({
  children,
  fontKey,
  flatten,
}: {
  children: React.ReactNode;
  fontKey: string;
  flatten: boolean;
}) {
  const isWide = useIsWide();
  const dbRef = useRef<Database | null>(null);
  const gridRef = useRef<Cell[][] | null>(null);
  const overlayRef = useRef<OverlayState | null>(null);
  const eventStateRef = useRef<EventState | null>(null);
  const [, setTick] = useState(0);

  const config = FONTS[fontKey] ?? FONTS.hack;

  useEffect(() => {
    loadFontFaces(fontKey);
  }, [fontKey]);

  const [emitter] = useState(createFlushEmitter);

  useEffect(() => emitter.subscribe((snapshot: FlushSnapshot) => {
    dbRef.current = snapshot.database;
    gridRef.current = snapshot.grid;
    overlayRef.current = snapshot.overlayState;
    eventStateRef.current = snapshot.eventState;
    setTick((t) => t + 1);
  }), [emitter]);

  const paneStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
  };

  const separatorStyle: React.CSSProperties = isWide
    ? { width: 1, background: "#333", flexShrink: 0 }
    : { height: 1, background: "#333", flexShrink: 0 };

  const labelStyle: React.CSSProperties = {
    position: "absolute",
    top: 4,
    left: 8,
    color: "#555",
    fontSize: 11,
    fontFamily: "sans-serif",
    pointerEvents: "none",
    userSelect: "none",
    zIndex: 1,
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isWide ? "row" : "column",
        width: "100vw",
        height: "100vh",
        background: "#0a0a0a",
      }}
    >
      <div
        style={{
          ...paneStyle,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: config.family,
          color: "#ccc",
        }}
      >
        <span style={labelStyle}>dom</span>
        <FlushEmitterContext.Provider value={emitter}>
          {children}
        </FlushEmitterContext.Provider>
      </div>
      <div style={separatorStyle} />
      <div style={{ ...paneStyle, position: "relative" }}>
        <span style={labelStyle}>xterm</span>
        <TerminalPane
          grid={gridRef.current}
          overlayState={overlayRef.current}
          database={dbRef.current}
          eventState={eventStateRef.current}
          fontFamily={config.family}
        />
      </div>
      <div style={separatorStyle} />
      <div style={{ ...paneStyle, position: "relative" }}>
        <span style={labelStyle}>three.js</span>
        <ThreeDeePane
          db={dbRef.current}
          overlayState={overlayRef.current}
          fonts={config.fonts}
          flatten={flatten}
        />
      </div>
    </div>
  );
}

const preview: Preview = {
  globalTypes: {
    font: {
      description: "Font family",
      toolbar: {
        title: "Font",
        icon: "paragraph",
        items: [
          { value: "hack", title: "Hack" },
          { value: "ibm-plex-mono", title: "IBM Plex Mono" },
          { value: "iosevka", title: "Iosevka" },
        ],
        dynamicTitle: true,
      },
    },
    flatten: {
      description: "Flatten non-overlapping 3D layers",
      toolbar: {
        title: "Flatten",
        icon: "collapse",
        items: [
          { value: true, title: "Flatten layers" },
          { value: false, title: "Explode all layers" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    font: "hack",
    flatten: true,
  },
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story, context) => (
      <TriPaneDecorator
        fontKey={context.globals.font as string}
        flatten={context.globals.flatten as boolean}
      >
        <Story />
      </TriPaneDecorator>
    ),
  ],
};

export default preview;

# charui build plan

A React renderer for character-grid UIs. Like React Native uses Yoga to lay out native views, charui uses Yoga to lay out character cells. TUI-inspired, but not TUI-limited: the same components render to a terminal, a browser, or a Three.js scene.

## Architecture

```
React JSX -> Reconciler -> Layout Database -> Cell Grid -> Backend
                           (Yoga->integers)  (Cell[][])    +- toString (tests)
                           queryable via                    +- DOM (browser)
                           hooks                            +- WebGL
                                                            +- Three.js (XR)
```

- **Layout database** -- Yoga computes layout, results stored as integer bounds (floor position, ceil size). Hooks query it: `useBounds(ref)` returns `{x, y, w, h}`. Subscriptions via `useSyncExternalStore`. Framework-agnostic.
- **Cell grid** -- `Cell[][]`, each cell `{ char, style }`. No layers. Components write characters into their allocated bounds. Rasterizer clips at node boundaries.
- **Stateless components** -- Controlled, pure functions. Props in, cells out. State lives in userland.
- **Events** -- Pointer events matching React DOM/R3F. Hit testing via tree walk. Integer grid coordinates.

## Design principles

- Treat Yoga output as a **reactive database** (out of the tar pit, FRP-inspired)
- Everything **stateless and controlled** -- components are pure functions
- Pointer events match **React DOM / R3F** (capture/bubble, focus, pointer capture)
- **Integer grid coordinates** everywhere (floor position, ceil size)
- **No layers** in the cell grid -- single `Cell[][]`, z-order via tree traversal
- CJK/emoji **wide character support** with continuation cells
- Support custom keyboard shortcuts via action mapping (replaceable later)

## Packages

| Package | Purpose | Status |
|---|---|---|
| `@charui/core` | Layout database, Yoga integration, cell grid, events, yoga style application | Done |
| `@charui/react` | React reconciler, hooks, `<Box>`/`<Text>` primitives | Done |
| `@charui/dom` | DOM render backend, EditContext input capture | Done |
| `@charui/interactions` | useDrag, useResize, input adapters | Done (basic) |
| `@charui/components` | Input, ScrollBox | Input done, ScrollBox TODO |
| `@charui/terminal` | ANSI rendering (`toAnsi`) for terminal output | Done |
| `@charui/threedee` | 3D exploded view via React Three Fiber | Done |
| ~~`@charui/test-utils`~~ | Removed — `gridToString` lives in `@charui/core` | — |

## Build phases (for 1-shot rebuild)

### Phase 1: Monorepo scaffold
- pnpm workspace with `packages/*`
- turbo.json: dev, build, lint, test tasks
- oxlint with react plugins
- Storybook with vite, wasm plugin, top-level-await plugin (for yoga-layout)
- Playwright config against storybook at localhost:6006
- Root package.json scripts: dev, build, lint, test, storybook, playwright

### Phase 2: @charui/core
- `cell.ts` -- `Cell { char, style }`, `CellStyle { fg?, bg?, bold?, italic?, underline? }`, `createGrid(w, h)`
- `database.ts` -- `Database`, `LayoutNode`, `Bounds`, CRUD ops, `computeLayout`, `subscribe` for useSyncExternalStore
- `measure.ts` -- `measureText` and `wrapText` using `string-width` for CJK/emoji. Word-boundary wrapping.
- `borders.ts` -- `writeBorder` using `cli-boxes` border characters (single, double, rounded, etc.)
- `rasterize.ts` -- walk tree, write chars/borders to `Cell[][]` with clipping. Handle wide chars with continuation cells.
- `events.ts` -- `EventState`, `PointerEvent`, `KeyEvent`, `FocusEvent`, `TextUpdateEvent`. Hit testing (tree walk, back-to-front for z-order). Focus management with tab cycling. Pointer capture. Capture/bubble dispatch matching React DOM. `handlePointerDown()` centralizes hitTest → findFocusable → setFocus → dispatch so backends don't duplicate focus logic.
- `overlays.ts` -- `OverlayState`, `setOverlay`, `removeOverlay`, `applyOverlays`. Post-rasterization transforms (invert, merge). Priority-based stacking. `applyOverlaysToGrid()` for per-node overlay application (3D backend).
- `flush-emitter.ts` -- `FlushEmitter` with `emit(snapshot)` / `subscribe(callback)`. `FlushSnapshot` bundles `{ database, grid, overlayState, eventState }`. Replaces old DatabaseReporterContext pattern.
- `yoga-styles.ts` -- `applyYogaStyles(database, node, props)` maps typed props to Yoga API calls. Extracted from reconciler for reuse and testability.
- `types.ts` -- `NodeProps = BoxNodeProps | TextNodeProps` discriminated union. Typed prop interfaces instead of `Record<string, unknown>`.

**Yoga gotchas:**
- Must call `unsetMeasureFunc()` before `free()` to prevent crashes
- `measureFunc` can only be set on leaf nodes (no children)
- After setting measureFunc, call `markDirty()` if node has no children

**Dependencies:** `yoga-layout`, `string-width`, `cli-boxes`

### Phase 3: @charui/react
- `reconciler.ts` -- React 19 custom reconciler via `react-reconciler`. Uses `applyYogaStyles` from core. Handles createInstance, commitUpdate, appendChild, removeChild, insertBefore. Text instances get measureFunc.
- `primitives.tsx` -- `<Box>` and `<Text>` components with typed props (`BoxProps`, `TextProps`). Thin wrappers around `createElement("box"/"text", props)`.
- `hooks.ts` -- `useBounds(db, nodeId)` via useSyncExternalStore. `useFocused(eventState, nodeId)`. `useNode(db, nodeId)`.
- `render.ts` -- `createRoot(w, h)` for headless rendering. Returns `{ render, unmount, flushLayout, getGrid, toString, database }`.

**Dependencies:** `react`, `react-reconciler`, `@charui/core`

### Phase 4: ~~@charui/test-utils~~ (removed)
- `gridToString` now lives in `@charui/core/src/cell.ts`

### Phase 5: @charui/dom
- `dom.ts` -- `renderToDOM(container, grid, prevGrid)` diff-based. Groups consecutive cells with same style into `<span>`. Row `<div>` reuse. `pixelToGrid(container, clientX, clientY)` with per-instance char width measurement (not global cache). `syncSelectionToDOM(container, overlayState)` maps overlay selection ranges to browser Selection API for clipboard support. `gridToDOM(container, row, col)` maps grid coords to DOM node+offset.
- `input.ts` -- `bindInput(container, database, eventState)` binds DOM pointer/keyboard events. Uses `handlePointerDown()` from core for focus/dispatch. DOM pointer capture follows charui capture. `container.focus()` on pointerdown to keep EditContext active.
- `CharuiCanvas.tsx` -- React component wrapper. Creates database, eventState, overlayState, reconciler. Renders children via reconciler (wrapped in `CanvasContext.Provider`), computes layout, rasterizes, renderToDOM, syncSelectionToDOM. Accepts optional `flushEmitter` prop (or reads from `FlushEmitterContext`) to notify secondary backends of flush snapshots. `::selection` CSS applied via `.charui-canvas` class.
- `context.ts` -- React context for database + eventState + overlayState (`CharuiContext`). `FlushEmitterContext` for providing `FlushEmitter` to CharuiCanvas.

### Phase 6: @charui/interactions
- `useDrag.ts` -- drag with pointer capture, delta tracking
- `useResize.ts` -- resize with min/max constraints

### Phase 7: @charui/components
- `Input.tsx` -- Stateless controlled input. Props: `value`, `selectionStart`, `selectionEnd`, `scrollOffset`, `showCursor` (not `focused` -- focus is about event routing, showCursor is about rendering the cursor overlay), `width`, `placeholder`, `onChange`, `onFocus`, `onBlur`. `applyAction` pure reducer. Drag-select via pointer events + pointer capture + overlay rendering (universal across backends). Uses `stateRef` pattern to avoid stale closures during rapid EditContext events. Cursor/selection rendered as inverted overlay cells. Reads overlayState/eventState/editContextSync from `useCanvasContext()` (charui reconciler context, not host-tree context).

### Phase 8: @charui/terminal
- `ansi.ts` -- `toAnsi(grid: Cell[][]): string`. Converts cell grid to ANSI escape sequences. Truecolor fg/bg via `\x1b[38;2;r;g;bm` / `\x1b[48;2;r;g;bm`. Bold `\x1b[1m`, italic `\x1b[3m`, underline `\x1b[4m`. Groups consecutive cells with same style into one escape sequence. Skips continuation cells. Uses `\r\n` line endings for terminal compatibility.

**Dependencies:** `@charui/core`

### Phase 9: @charui/threedee
- `ExplodedScene.tsx` -- Takes a `Database` directly, renders R3F `<Canvas>` with orthographic camera. Each `LayoutNode` rendered as geometry using `rasterizeOne()` from core: background `<mesh>` + `<planeGeometry>` for bg color, drei `<Text>` per non-empty cell for characters, `<Edges>` wireframe per node. `LAYER_SPACING = 0.6` (approx char width:height ratio). Nodes stacked along Z by tree depth. `interactive` prop controls OrbitControls. Accepts `fonts?: FontSet` (`{ regular, bold, italic, boldItalic }` URLs to `.ttf` files) — `pickFont()` selects the right variant per cell based on `style.bold` and `style.italic`.
- `ExplodedCanvas.tsx` -- Standalone wrapper with same API as `CharuiCanvas` (`{width, height, children}`). Runs its own headless reconciler + layout, passes database to `ExplodedScene`. Accepts `fonts?: FontSet`.

**Dependencies:** `@charui/core`, `@charui/react`, `react`, `three`, `@react-three/fiber`, `@react-three/drei`

### Phase 10: Stories & storybook decorator
- `CharuiCanvas.stories.tsx` -- BorderedBoxWithText, NestedBoxes, FlexRow, TextWrapping
- `Input.stories.tsx` -- InputField, FocusDemo (two inputs with tab cycling), ResizableBox
- `.storybook/preview.tsx` -- Global decorator renders every story in **3 panes**: DOM (interactive), xterm.js terminal (`toAnsi` output), 3D exploded view. All share one database via `FlushEmitter` — CharuiCanvas emits `FlushSnapshot` after each render, storybook subscribes via `emitter.subscribe()`. Terminal pane has SGR mouse reporting enabled (`\x1b[?1003h\x1b[?1006h`) so charui receives mouse events via `parseSGRMouse()`. Selection synced to both DOM (`syncSelectionToDOM`) and terminal (`syncSelectionToTerminal` via `term.select()`). Responsive layout: `flex-direction: row` when wide (>900px), `column` when narrow. Layout is `fullscreen`. xterm.js is a storybook-only devDep (`@xterm/xterm`). Storybook toolbar dropdown selects between 3 bundled monospace fonts (Hack, IBM Plex Mono, Iosevka) — all local `.ttf` files in `.storybook/fonts/` with licenses. Font selection updates all 3 panes: DOM via `@font-face` + `fontFamily`, terminal via xterm.js `fontFamily`, 3D via `FontSet` URLs. Each font has 4 variants (Regular, Bold, Italic, BoldItalic) loaded via the `FontFace` API with proper `weight`/`style` descriptors.

### Phase 11: Tests
- **Vitest unit tests** for core (database, events, measure, rasterize), react (reconciler), components (Input applyAction)
- **Playwright e2e** against storybook: input typing, arrow keys, focus/tab, resize drag, click-to-focus on text, click-to-position caret, pointer capture across box boundary, cursor styling (text cursor on input, resize cursor on draggable)

## Known issues / fixes applied

### 1. `focused` -> `showCursor` (Input component)
**Problem:** The `focused` prop on Input does double duty -- it means both "has focus" (event routing) and "show cursor block" (rendering). This conflates two concerns and made `useBlink` hacky (toggling `focused` looked like losing focus).
**Fix:** Rename to `showCursor?: boolean`. Stories pass `showCursor={focused === idx}`. Blink would be `showCursor={focused === idx && blinkVisible}`. Focus (event routing via `eventState.focusedId`) stays separate.

### 2. DOM pointer capture follows charui capture
**Problem:** Two pointer capture systems (charui's `capturedNodeId` for event routing, DOM's `setPointerCapture` for browser event delivery) manually kept in sync. Current code always captures on every pointerdown regardless of whether charui capture was requested.
**Fix:** Done. DOM automatically follows charui: after dispatching pointerdown via `handlePointerDown()`, check if `eventState.capturedNodeId` was set by a handler -- if so, call `container.setPointerCapture()`. On pointerup, if charui capture is released, release DOM capture. charui is the single source of truth.

### 3. Typed props instead of `Record<string, unknown>`
**Problem:** Props are `Record<string, unknown>` everywhere in core/reconciler. Every access is `as string`, `as number`. No compile-time safety -- typos like `flexshrink` silently fail.
**Fix:** Define `NodeProps` discriminated union in core: `BoxNodeProps | TextNodeProps` with all Yoga layout props, event handler props, and component-specific props properly typed. The reconciler still receives `Record<string, unknown>` from React but casts to typed props at the boundary. Core functions use typed props internally.

### 4. Extract `applyYogaStyles()` to core
**Problem:** `applyYogaStyles()` is ~120 lines of Yoga config mixed into the reconciler. It belongs in core since it's pure layout logic with no React dependency.
**Fix:** Move to `@charui/core/src/yoga-styles.ts`. Export from core index. Reconciler imports and calls it.

### 5. Per-instance font width cache
**Problem:** `measureCharWidth` in `dom.ts` uses module-level `cachedCharWidth`/`cachedFontSize`. Breaks if two CharuiCanvas instances use different font sizes.
**Fix:** Accept a `Map<number, number>` cache object (fontSize -> charWidth) as a parameter. CharuiCanvas creates the cache and passes it through. Or simpler: make `pixelToGrid` accept `cellWidth` directly and let CharuiCanvas measure + cache it.

## TODO (future)

- Terminal render backend (ANSI done in `@charui/terminal`, full terminal app with input TODO)
- WebGL render backend
- Three.js / XR backend (basic exploded view done in `@charui/threedee`, XR TODO)
- ScrollBox component
- More components: Button, Select, TextArea, Panel
- More interaction hooks: useHover, useClick
- Overlay extensions: squiggly underlines, arrows between nodes
- Virtualization (distant)
- EditContext polyfill (cross-browser — user is writing this)
- Customizable keyboard shortcut mapping / action system
- `useBlink(active)` hook in interactions (needs showCursor, not focused)
- react-spring animation support (Yoga works with fractional intermediate values, floor/ceil at render time)
- Sub-cell precision (if needed for smooth drag -- 50/50 on whether this is wanted)
- Embedded content (images, HTML) as fixed-size-multiple overlays
- Emoji rendering in @charui/threedee — troika can't render color emoji (CBDT/COLR bitmap tables). Options: (a) runtime: render each unique emoji to an offscreen `<canvas>` via `ctx.fillText()`, create `THREE.CanvasTexture`, display as textured quad/sprite at cell position; (b) compile-time: pre-generate emoji sprite atlas at build time, ship as static asset. Need to evaluate both approaches — runtime is simpler but has first-render latency, compile-time needs a build step but is instant. DOM and terminal panes handle emojis natively via browser/system font fallback.
- Undo/redo architecture (make it pluggable, lots of nuance)
- Terminal keyboard input (xterm.js `onData` for non-mouse sequences → charui key events)

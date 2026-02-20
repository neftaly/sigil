# Implementation Plan

## Decisions

**Single package: `@neftaly/sigil`.** No monorepo package split.
Subpath exports for heavy/optional surfaces:

```
@neftaly/sigil             core + react + widgets
@neftaly/sigil/dom         DOM surface + ARIA + input binding
@neftaly/sigil/terminal    ANSI surface + stdin input + TerminalCanvas
@neftaly/sigil/threedee    3D debug surface (three.js, heavy)
```

**tsup for builds.** One config, one build, one publish.

**Skip kit for v1.** Atoms only. Patterns in storybook cover the gap.

**Skip accessible render mode for v1.** ARIA hidden elements ship.
Plain-text mode comes later.

**Terminal input is ~200 lines, zero deps.** `parseSGRMouse` already
exists. Add keyboard parsing + raw mode + SIGWINCH + bracketed paste.

---

## Starting point

~3,500 lines of app code + ~2,800 lines of tests. Refactor into
single-package structure.

### Current → new structure

```
packages/core/src/        →  src/core/
packages/react/src/       →  src/react/
packages/dom/src/         →  src/dom/
packages/terminal/src/    →  src/terminal/
packages/threedee/src/    →  src/threedee/
packages/components/src/  →  (delete, rebuild as src/widgets/)
packages/interactions/src/ → (delete, merge into src/react/)
```

Single package.json. Subpath exports. All tests move to flat
test/ or colocated .test.ts files. Storybook stories stay colocated.

### What exists and what changes

| Module | Exists | Changes |
|---|---|---|
| src/core/ | cell, layout (Yoga), events, rasterize, borders, color, measure, overlays, flush-emitter. Fuzz tests. | Add Patch + compositor. Rasterizer emits Patch[]. Overlays → decorations. Add keymap, interaction reducers. Add stopPropagation. |
| src/react/ | React 19 reconciler, Box/Text, useBounds, createRoot. | Add FocusTrap, ThemeProvider, hooks. Add resize(). Fix nested Text. |
| src/dom/ | Diff-based renderToDOM, EditContext input, CharuiCanvas. | Add ARIA manager. |
| src/terminal/ | toAnsi, parseSGRMouse, syncSelectionToTerminal. | Add stdin parser, raw mode, SIGWINCH, TerminalCanvas. |
| src/threedee/ | R3F exploded view, depth flattening. | Keep as-is. |
| src/widgets/ | (new) | All 16 atoms. |

### Delete

- `apps/docs/` — empty scaffold
- `packages/interactions/` — merge useDrag/useResize into src/react/
- `packages/components/` — replaced by src/widgets/
- All per-package package.json, tsconfig, turbo config

### Monorepo tooling changes

Keep: pnpm, oxlint, vitest, fast-check, playwright, storybook,
xterm.js.

Remove: turborepo (not needed for single package).

---

## Phase 0: Docs site (static)

Build the docs site first so designs can be reviewed before writing
library code. All content is static — interactive examples get wired
up as widgets are built in later phases.

### 0a. Astro scaffold

```
site/
  src/
    layouts/TuiLayout.astro
    pages/
      index.astro
      getting-started/
      widgets/          ← one page per atom
      kit/              ← one page per molecule (v2 placeholder)
      patterns/
      surfaces/
    styles/tui.css      ← monospace, dark theme, box-drawing borders
  astro.config.ts
```

### 0b. Static widget pages

Convert docs/components.md into individual pages. Each widget page:
- Description
- ASCII mockup (from the spec, rendered in `<pre>`)
- Prop table
- Code example
- Accessible mode rendering
- Placeholder box for future interactive demo

### 0c. Architecture + surface pages

Convert docs/architecture.md, core.md, react.md, dom.md,
terminal.md, threedee.md into browsable pages under Surfaces
and an Architecture overview.

### 0d. Demo pages

Kitchen sink and file browser mockups as standalone pages.

### 0e. Deploy preview

GitHub Pages or Vercel preview deploy so the site is browsable
from a URL. CI builds the site on every push.

### Milestone: design review

All designs browsable at a URL. Review visual language, widget
specs, prop APIs, accessible modes, architecture. Sign off before
writing library code. Interactive demos are placeholder boxes
at this stage.

---

## Phase 1: Restructure + CI

### 1a. Flatten to single package

1. Create `src/` with subdirectories (core, react, dom, terminal,
   threedee, widgets)
2. Move source files from `packages/*/src/` to `src/*/`
3. Update all import paths
4. Single root package.json with subpath exports
5. Single tsconfig.json
6. Move tests to colocated .test.ts files
7. Update storybook config for new paths
8. Delete packages/, turbo.json

### 1b. Build step

tsup with multiple entry points:

```ts
// tsup.config.ts
export default {
  entry: {
    index: 'src/index.ts',
    dom: 'src/dom/index.ts',
    terminal: 'src/terminal/index.ts',
    threedee: 'src/threedee/index.ts',
  },
  format: ['esm'],
  dts: true,
}
```

### 1c. CI pipeline

Expand existing workflow:

```yaml
- pnpm install --frozen-lockfile
- pnpm lint
- pnpm test
- pnpm build
- pnpm storybook build
- pnpm site build
```

### 1d. Rename @charui → @neftaly/sigil

Update package.json name, all internal references, storybook title,
README.

### Milestone: hello world

After Phase 1, verify both paths work:

**DOM:**
```tsx
import { Box, Text } from '@neftaly/sigil'
import { CharuiCanvas } from '@neftaly/sigil/dom'

<CharuiCanvas width={40} height={10}>
  <Box border="single" padding={1}>
    <Text>Hello world</Text>
  </Box>
</CharuiCanvas>
```

**Terminal:**
```tsx
import { Box, Text } from '@neftaly/sigil'
import { createTerminalRoot } from '@neftaly/sigil/terminal'

const app = createTerminalRoot();
app.render(
  <Box border="single" padding={1}>
    <Text>Hello world</Text>
  </Box>
);
```

Both should render a bordered box with text. Terminal version
responds to Ctrl+C to exit. This proves the full pipeline works
before building widgets.

---

## Phase 2: Core architecture

### 2a. Patches + compositor

~200 lines new, ~100 refactored.

1. Add `Patch` type: `{ origin, cells, z, clip? }`
2. Add `compose(patches, width, height): Cell[][]`
3. Refactor rasterizer: emit Patch[] instead of mutating grid
4. Convert overlays → decorations (patch transforms):
   - Cursor: high-z patch with inverted fg/bg at cursor position
   - Selection: high-z patches with highlight bg over selected runs
   - Focus ring: modifies border cells of focused node's patch
5. Update flush-emitter, DOM surface, storybook terminal pane

Edge case: wide chars (CJK/emoji) at clip boundaries or last
column. Continuation cell may be clipped — replace with space.

Property-based tests for compositor. Existing fuzz tests adapt.

### 2b. Event stopPropagation

`dispatchKeyEvent` already returns boolean. Stop bubbling when
handler returns true. ~10 lines.

### 2c. Interaction reducers

~150 lines total. Pure functions, no React.

- `selectionReducer(state, action, count)`
- `rangeReducer(state, action, config)`
- `textInputReducer(state, action)`

### 2d. Keymap system

~100 lines. `matchAction(keymap, overrides, event)` +
`listBindings(keymap, overrides)`. `KeymapOverrides` context
for global rebinding — widgets read via `useKeymap`.

### 2e. Viewport resize

`resize(width, height)` on createRoot. DOM: ResizeObserver.
Terminal: SIGWINCH.

### 2f. Scroll

scrollX/scrollY props on Box. Rasterizer offsets children,
compositor clips to box bounds. Scroll indicators (▲/▼).
`scrollIntoView(nodeId)` for focus system. Mouse wheel events
dispatched as scroll actions on the nearest scrollable ancestor.

---

## Phase 3: React layer

### 3a. Hooks

- `useSelection`, `useRange`, `useTextInput`, `useTextCursor`
- `useKeymap`, `useFilter`
- `useDrag`, `useResize` (port from interactions/)

### 3b. FocusTrap

Component wrapping focus trap/untrap.

### 3c. ThemeProvider

Visual tokens context.

### 3d. Box prop gaps

z, scrollX/scrollY, focusable, role, aria-*, event handlers, embed,
disabled (dims + blocks input + aria-disabled), error (red border +
error text below widget).

### 3e. Nested Text fix

Flatten to styled runs in reconciler. Single Yoga leaf with
measureFunc.

---

## Phase 4: Surfaces

### 4a. ARIA manager (DOM)

Hidden native HTML elements positioned over grid bounds.

### 4b. Terminal input source

~200 lines, zero deps. Unified stdin parser:
- SGR mouse → PointerEvent (parseSGRMouse exists)
- VT key sequences → KeyEvent
- Bracketed paste → insert action
- SIGWINCH → resize
- Cleanup on exit (mandatory)

### 4c. TerminalCanvas

Orchestrator for terminal apps. createRoot + stdin parser +
SIGWINCH + render loop. Cursor positioning for focused text fields.

Must handle:
- Alternate screen buffer on enter/exit
- Terminal state cleanup on SIGINT/SIGTERM/uncaughtException
- Single instance enforcement

### 4d. Gamepad / remote input source

Input source adapter that maps:
- D-pad → arrow keys (spatial nav)
- A/confirm → Enter
- B/cancel → Escape
- Shoulder → Tab / Shift+Tab

Same KeyEvent/PointerEvent types. Storybook story demonstrating
gamepad navigation through a form.

---

## Phase 5: Widgets

One at a time. Each = component + story + tests. As each widget
is built, wire up its interactive demo on the docs site (replacing
the static placeholder from Phase 0).

| # | Widget | Notes |
|---|---|---|
| 1 | Button | Proves keymap + press state. Port existing. |
| 2 | CheckBox | Simple toggle. Port existing. |
| 3 | Panel | Bordered container. Trivial. |
| 4 | Divider | Trivial. |
| 5 | ProgressBar | Display only. Port existing. |
| 6 | Spinner | Display only, animation. |
| 7 | Toggle | Visual variant of CheckBox. |
| 8 | RadioGroup | Proves selectionReducer. Port existing. |
| 9 | NumberInput | Proves rangeReducer. |
| 10 | Slider | rangeReducer + pointer. |
| 11 | ListBox | selectionReducer + scroll. |
| 12 | CheckList | Multi-select list. |
| 13 | TabBar | selectionReducer for tabs. |
| 14 | TextField | textInputReducer + keymap + cursor. Port Input.tsx. |
| 15 | Dialog | FocusTrap + Panel + high-z Box. |
| 16 | TextArea | textInputReducer + scroll + cursor. Most complex. |

---

## Phase 6: Testing + performance

### Continuous (during phases 2-5)

- Unit tests for every reducer, compositor, keymap
- Story for every widget state
- Existing e2e tests adapted

### After phase 5

- Visual regression (Playwright screenshots)
- axe-core on every story
- Performance benchmarks + CI tracking
- Playwright traces for flame graph analysis

---

## Phase 7: Kit (v2)

After v1 ships:

1. Popover
2. Toast
3. Autocomplete
4. CommandPalette
5. Table (TanStack)
6. ColorPicker
7. DatePicker

---

## Future work (post-v1)

- [ ] Kit molecules (Phase 7): Popover, Toast, Autocomplete, CommandPalette, Table, ColorPicker, DatePicker
- [ ] Accessible plain-text render mode (`<ModeProvider value="accessible">`)
- [ ] RTL / bidirectional text support
- [ ] Deno / Bun terminal support
- [ ] Terminal clipboard (OSC 52)
- [ ] Terminal color profile detection + degradation (256/16/none)
- [ ] npm publish workflow + semver policy
- [ ] react-spring animation integration
- [ ] Color blindness support (high-contrast theme, shape-only focus indicators already in place, test with simulators)

---

## Shipping blockers (v1 checklist)

- [ ] Docs site browsable (static design review)
- [ ] Single-package restructure + rename
- [ ] Build step (tsup + subpath exports)
- [ ] CI pipeline (lint + test + build + site)
- [ ] Patches + compositor
- [ ] Event stopPropagation
- [ ] Interaction reducers
- [ ] Keymap system
- [ ] Viewport resize
- [ ] Scroll (Box props + indicators + scroll-into-view)
- [ ] React hooks (useSelection, useRange, useTextInput, etc.)
- [ ] FocusTrap + ThemeProvider
- [ ] Box prop gaps (z, scroll, focusable, role, aria-*, events, embed)
- [ ] Nested Text fix
- [ ] ARIA manager (DOM)
- [ ] Terminal input source + TerminalCanvas
- [ ] All 16 widgets with interactive docs site demos
- [ ] Hello world works in both DOM and terminal

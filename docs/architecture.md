# Architecture

charui is a React renderer for character-grid UIs. Same component tree renders to DOM, terminal (ANSI), or Three.js.

## Pipeline

```
JSX → Reconciler → Layout (Yoga, integers)
                       ↓
                   Rasterize → Patch[]
                       ↓
                   Decorate
                       ↓
                   Compose → Cell[][]
                       ↓
                   Surface (DOM/Term/3D)
```

Accessibility is props on nodes (`role`, `aria-*`), not a parallel tree. Surfaces read them from the node store.

Patches are positioned cell fragments with z-index. Compositor flattens them into Cell[][]. Overlays (Dialog) are just high-z patches via `z` prop on Box. Cursors and selections are decorations (patch transforms).

## Structure

Single package: `@neftaly/sigil`. Subpath exports for optional surfaces.

```
@neftaly/sigil             Main entry. Core + React + widgets.
  src/core/                  Layout, cells, patches, compositor,
                             decorations, focus, input dispatch,
                             keymap, interaction reducers,
                             event types. No React.
  src/react/                 Reconciler, Box/Text/FocusTrap,
                             hooks (wrapping core reducers),
                             theme (tokens + mode), createRoot.
  src/widgets/               All UI components (atoms).

@neftaly/sigil/dom         DOM surface + input source + ARIA renderer.
@neftaly/sigil/terminal    ANSI surface + stdin input + TerminalCanvas.
@neftaly/sigil/threedee    3D debug visualization (R3F).
```

## Atoms, molecules, and patterns

Components are split by complexity into three tiers.

**Atoms** (`src/widgets/`) — v1. Each maps to one UI concept, often backed by a single core reducer. The minimum set of controls any app needs. One concept per widget, no composition of other widgets. TextField, Button, ListBox, Slider, etc.

**Molecules** (v2 kit) — compound components built from atoms. Non-trivial composition: complex positioning, multi-view state machines, external library integration, or interaction patterns that are easy to get wrong. ColorPicker, DatePicker, Table, CommandPalette, Autocomplete, Toast, Popover.

**Patterns** (docs only) — composition recipes shown in documentation. Short examples demonstrating how to combine atoms. No export, no import — just examples users copy and adapt. Alert, Tooltip, Breadcrumb, Accordion, Skeleton, ContextMenu, Splitter, TreeView.

The test: if a competent user can build it in under 30 lines from existing atoms, it's a pattern. If it requires tricky positioning, state coordination across multiple widgets, or integration with an external library, it's a molecule.

## Principles

- Integer grid coords (floor pos, ceil size)
- Patches + compositor, not mutable framebuffer
- Interaction logic as framework-agnostic reducers (state machines)
- Widgets are presentation over hooks
- Accessibility as props on nodes, not a parallel tree
- Surfaces decouple output from input sourcing
- Visual tokens separate from render mode
- Truecolor always, no detection
- Ecosystem compatible (React Hook Form, Zod, TanStack Table)

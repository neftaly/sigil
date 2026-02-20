# Core

Framework-agnostic foundation. Pure data structures, reducers, and functions. No React, no DOM.

## Cell

```ts
type Cell = { char: string; style: CellStyle }
type CellStyle = { fg?: string; bg?: string; bold?: boolean; italic?: boolean; underline?: boolean }
```

Wide chars (CJK/emoji) use continuation cells. `string-width` for measurement.

## Patch

Positioned cell fragment with explicit z-ordering. The atomic unit of rendering output.

```ts
type Patch = {
  origin: [x: number, y: number]
  cells: Cell[][]    // local coordinates
  z: number          // compositing order
  clip?: Rect        // optional clip region
}
```

Rasterization emits patches. Dialog is a high-z patch. Cursor is a decoration that emits a high-z patch. No special overlay/effects system.

## Compositor

Flattens patches into a Cell[][] grid for surfaces.

```ts
compose(patches: Patch[], width: number, height: number): Cell[][]
```

Sorts by z-index, composites back-to-front. Clips patches to their clip regions. This is the only place a Cell[][] grid exists.

## Decorations

Patch transforms. Pure functions that modify or emit patches.

```ts
type Decoration = (patches: Patch[], state: Record<string, unknown>) => Patch[]
```

Open-ended -- any code can define decorations with whatever state they need. Built-in decorations:

- **Cursor**: emits a high-z patch with inverted fg/bg at cursor position. Surfaces drive blink natively -- DOM uses CSS animation, terminal uses the native cursor (see terminal.md).
- **Selection**: emits high-z patches with highlight background over selected text runs.
- **Focus ring**: modifies border cells of the focused node's patch.

Composable -- apply in sequence. Decoration state changes trigger recompose + surface output without involving the React reconciler.

## Layout

Yoga wrapper. Integer bounds (floor position, ceil size). CRUD for layout nodes. `computeLayout()` runs Yoga. Subscribable (`useSyncExternalStore` compatible).

```ts
type NodeId = string
type Rect = { x: number; y: number; width: number; height: number }

type LayoutTree = {
  createNode(id: NodeId, props: LayoutProps): void
  updateProps(id: NodeId, props: Partial<LayoutProps>): void
  removeNode(id: NodeId): void
  appendChild(parentId: NodeId, childId: NodeId): void
  insertBefore(parentId: NodeId, childId: NodeId, beforeId: NodeId): void
  computeLayout(width: number, height: number): void
  getBounds(id: NodeId): Rect
  getChildren(id: NodeId): NodeId[]
  getParent(id: NodeId): NodeId | null
  subscribe(callback: () => void): () => void   // for useSyncExternalStore
}
```

## Text Mapping

Utilities for mapping between string indices and grid positions in wrapped text.

```ts
stringIndexToGrid(text: string, wrapWidth: number, index: number): { x: number; y: number }
gridToStringIndex(text: string, wrapWidth: number, x: number, y: number): number
```

Used by hooks to resolve mouse click → cursor position, and visual up/down → string index. Depends on `wrapText` / `measureText`.

## Rasterize

```ts
rasterize(tree: LayoutTree): Patch[]
```

Tree walk emitting patches. Each node produces a patch at its computed bounds with background, border, then text. Children get higher z than parents.

## Borders

`writeBorder(cells, type, style)` using `cli-boxes`.

```
single: ┌──┐    double: ╔══╗    rounded: ╭──╮
        │  │            ║  ║             │  │
        └──┘            ╚══╝             ╰──╯
```

## Focus

State machine for focus management. Separate from pointer and keyboard -- both depend on it.

```ts
type FocusState = {
  current: NodeId | null
  trapped?: NodeId         // focus trap
}
```

**Tab order**: `focus(id)`, `blur()`, `next(tree)`, `prev(tree)`. `next`/`prev` walk focusable nodes in layout tree order (depth-first). No stored order list -- derived from the tree each time. Nodes are focusable when they have a `focusable` prop (set by widgets that need keyboard input).

**Focus trap**: `trap(id)`, `untrap()`. `next()`/`prev()` and spatial nav cycle within the trapped subtree. Caller stores previous focus for restoration: `const prev = state.current; trap(id); ... untrap(); focus(prev);`

**Spatial navigation**: `focusUp()`, `focusDown()`, `focusLeft()`, `focusRight()`. Enables D-pad, remote control, and game controller navigation. Same state machine, different traversal:

1. Compute exit point on current element's edge in the navigation direction
2. Filter focusable siblings in the parent container by direction (candidates must be ahead of exit point)
3. Score by weighted distance: perpendicular offset weighted higher than directional distance (prevents diagonal jumps)
4. If no candidate in current container, recurse to parent — try the parent's siblings, then grandparent's, etc.
5. Select closest

Container-first hierarchy means navigation stays within a group before escaping. A Panel's children are tried before sibling Panels.

**Edge cases**:

- **Focused node removed**: focus moves to nearest spatial neighbor, or first in tab order.
- **Widget-internal vs cross-widget nav**: widgets consume directional input while they can handle it (e.g., ListBox eats Up/Down for selection). At boundary (first/last item), the event bubbles up to the focus system for cross-widget navigation. Controlled by the widget returning "handled" or not from its keymap handler.
- **Pointer ↔ D-pad switching**: pointer events set focus silently. When D-pad input arrives, focus picks up from wherever pointer left it.
- **Scroll into view**: when spatial nav focuses a node inside a scrollable Box, auto-scroll to reveal it.
- **No wrap-around** by default. Navigation stops at boundaries — avoids confusion on complex layouts. Widgets may wrap internally (e.g., RadioGroup).

`isAncestor(tree, ancestorId, descendantId)`: general tree utility. Walks `getParent()` from descendant. Useful for focus containment checks, hit testing, spatial nav scoping. For "entered" styling (does this container hold focus?): `id === state.current || isAncestor(tree, id, state.current)`.

## Input Dispatch

Two separate mechanisms (different propagation models):

**Pointer**: `dispatchPointerEvent(event, layoutTree)` -- hit-tests layout rects, dispatches to topmost node (highest z), bubbles up tree. Pointer capture for drag.

**Keyboard**: `dispatchKeyEvent(event, focusState)` -- sends to focused node, bubbles up tree. Returns `boolean` (handled).

The caller handles fallback: if `dispatchKeyEvent` returns false and the event is directional, call `focusUp`/`focusDown`/`focusLeft`/`focusRight`. This keeps dispatch and focus traversal separate.

These share nothing except NodeId. Pointer is spatial, keyboard follows focus chain.

Input sources (stdin, DOM events, gamepad) normalize to the same event types. A D-pad maps to arrow keys. A gamepad's confirm/cancel buttons map to Enter/Escape via the input source, not the focus system.

## Keymap

Two separate concerns:

**Definition** -- components declare actions with default bindings:

```ts
const LIST_KEYMAP = {
  moveUp:  { keys: ["ArrowUp", "k"],  label: "Move up" },
  confirm: { keys: ["Enter"],          label: "Select" },
};
```

**Resolution** -- `matchAction(keymap, overrides, event)` returns action name or null. Handles user overrides and priority (focused component wins).

**Overrides** -- user-provided rebindings. A `KeymapOverrides` context (in @neftaly/sigil) lets apps or users remap keys globally. Widgets read it via `useKeymap`. Overrides are `Record<actionName, string[]>` — same shape as the default keys.

`listBindings(keymap, overrides)` returns all active bindings (data). Formatting is a widget-layer concern (see `formatKeymap` in @neftaly/sigil).

## Interaction Reducers

Pure state machines for interaction logic. `(State, Action) → State`. Framework-agnostic -- React hooks wrap these with `useReducer`.

### selectionReducer

Navigate a discrete ordered set.

```ts
type SelectionState = { index: number }
type SelectionAction =
  | { type: 'up' } | { type: 'down' }
  | { type: 'first' } | { type: 'last' }
  | { type: 'to'; index: number }

selectionReducer(state, action, count: number): SelectionState
```

`count` is a parameter, not state -- it's a property of the data, not the selection. Hooks derive it from the options array.

Used by: ListBox, RadioGroup, TabBar, CheckList (for navigation).

### rangeReducer

Continuous value within bounds.

```ts
type RangeState = { value: number }
type RangeConfig = { min: number; max: number; step: number }
type RangeAction =
  | { type: 'increment' } | { type: 'decrement' }
  | { type: 'set'; value: number }
  | { type: 'toMin' } | { type: 'toMax' }

rangeReducer(state, action, config: RangeConfig): RangeState
```

`min`/`max`/`step` are config, not state -- they're declared by the component, not changed by user interaction. Hooks pass them from props.

Used by: NumberInput, Slider.

### textInputReducer

Text editing: cursor, selection, mutation. Operates on string indices only -- no layout awareness.

```ts
type TextInputState = {
  value: string
  cursor: number
  anchor: number | null    // selection start, null if no selection
}
type TextInputAction =
  | { type: 'insert'; text: string }
  | { type: 'delete'; direction: 'forward' | 'backward' }
  | { type: 'moveTo'; position: number }
  | { type: 'moveBy'; offset: number }          // left = -1, right = +1
  | { type: 'moveToEdge'; edge: 'start' | 'end' }       // start/end of value
  | { type: 'select'; anchor: number; focus: number }
  | { type: 'selectAll' }
```

No `up`/`down` -- those depend on visual line width. The React hook resolves visual positions using text mapping utilities, then dispatches `moveTo`.

Used by: TextField, TextArea.

## Accessibility

Semantic info lives on node props, not a parallel tree. Components declare accessibility via props on Box:

```tsx
<Box role="listbox" aria-label="Factions">
```

The reconciler stores these mechanically (props in, node props out). No separate semantic tree construction. Surfaces read semantic props from LayoutTree:
- DOM surface creates hidden ARIA HTML elements positioned over grid bounds
- Accessible mode renders plain text from semantic props

`role` is an open string (not an enum) -- widgets define their own roles. Common roles: `textbox`, `listbox`, `option`, `slider`, `checkbox`, `radiogroup`, `button`, `dialog`, `progressbar`, `status`, `spinbutton`, `group`, `tablist`, `tab`, `tabpanel`.

Additional aria props: `aria-label`, `aria-value`, `aria-checked`, `aria-selected`, `aria-disabled`, plus an `aria` escape hatch (`Record<string, string | number | boolean>`) for anything not covered.

## Event Types

Normalized event types used by all input sources:

```ts
type PointerEvent = {
  type: 'pointerdown' | 'pointerup' | 'pointermove'
  col: number; row: number    // grid coordinates
  button: number
  ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean
}

type KeyEvent = {
  type: 'keydown' | 'keyup'
  key: string; code: string   // browser-shaped key names
  ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean
}
```

Input sources (DOM events, stdin, gamepad) normalize to these types. Terminal input sources translate ANSI escape sequences to browser-style `key`/`code` values. Gamepad D-pad maps to arrow keys, confirm/cancel to Enter/Escape.

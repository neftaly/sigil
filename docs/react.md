# React Bindings

React bindings over @neftaly/sigil.

## Reconciler

Standard `react-reconciler`. `createInstance` → `db.createNode`, `commitUpdate` → `db.updateProps`. Purely mechanical -- stores whatever props components declare (including `role`, `aria-*`). No semantic interpretation.

## Elements

**Box** -- layout container (Yoga node). Props:

- Layout: all Yoga flex/padding/margin props
- Style: `border`, `bg`, `fg`
- Position: `z` (compositing order), `position` (`"relative"` | `"absolute"`), `left`, `top`, `right`, `bottom`
- Scroll: `scrollX`, `scrollY` (see below)
- Embed: `embed` (see below)
- Accessibility: `role`, `aria-*`, `focusable`
- Events: `onPointerDown`, `onPointerUp`, `onPointerMove`, `onKeyDown`, `onKeyUp`

```tsx
<Box width={30} padding={1} border="rounded" flexDirection="row">
```

Optional `scrollX`/`scrollY` props for scrollable containers. Rasterizer applies offset to children, compositor clips to box bounds. No separate scroll element.

```tsx
<Box width={20} height={4} scrollY={2}>
```

Optional `embed` prop -- a mount function `(container: HTMLElement, bounds: DOMRect) => (() => void)` that surfaces call to render native content at the node's grid bounds. Returns a cleanup function. Other surfaces ignore it, showing children as fallback cells.

```tsx
<Box width={20} height={10} embed={(el, rect) => {
  const img = document.createElement('img');
  img.src = 'photo.jpg';
  img.style.cssText = `width:${rect.width}px;height:${rect.height}px;object-fit:cover`;
  el.appendChild(img);
  return () => el.removeChild(img);
}}>
  <Text fg="#888">[photo.jpg]</Text>
</Box>
```

`@neftaly/sigil/dom` exports `embedReact(node: ReactNode)` helper for the common case:

```tsx
import { embedReact } from '@neftaly/sigil/dom';
<Box width={20} height={10} embed={embedReact(<img src="photo.jpg" />)}>
  <Text fg="#888">[photo.jpg]</Text>
</Box>
```

Children are the terminal/3D fallback — they render when `embed` is ignored. **Make fallbacks meaningful**: show a text description, not just `[native content]`. The fallback is the only thing terminal users see.

**Text** -- leaf node with `measureFunc`. Props: `bold`, `italic`, `underline`, `fg`, `bg`. Supports nested `<Text>` for inline style runs: `<Text>Press <Text bold>Enter</Text> to confirm</Text>`.

**FocusTrap** -- wraps children and calls `trap(id)` on mount, `untrap()` on unmount. Stores and restores previous focus. Independent from visual chrome.

```tsx
<FocusTrap><Panel title="Confirm">...</Panel></FocusTrap>
```

## Hooks

Wrap core reducers with `useReducer` + wire keyboard handling via `useKeymap`:

- `useSelection(options)` -- wraps `selectionReducer`. Returns `{ index, moveUp, moveDown, confirm }`.
- `useRange(config)` -- wraps `rangeReducer`. Returns `{ value, increment, decrement, set }`.
- `useTextInput(config)` -- wraps `textInputReducer`. Returns `{ value, cursor, anchor, insert, delete, moveLeft, moveRight, moveHome, moveEnd, setCursor(pos), setSelection(anchor, focus) }`. No layout awareness.
- `useTextCursor(textInput, wrapWidth)` -- adds visual position resolution on top of `useTextInput`. Returns `{ moveUp, moveDown, clickAt(gridX, gridY) }`. Uses `gridToStringIndex` to resolve visual positions, then dispatches `setCursor`. TextArea composes both; TextField uses only `useTextInput`.
- `useFilter(options, filterFn?)` -- filters an options list by text. Returns `{ text, setText, filtered }`. Compose with ListBox for type-to-filter.
- `useKeymap(keymap, handlers)` -- matches key events to named actions. Exposes active bindings via `listBindings()`.
- `useDrag(config)` -- pointer capture + integer grid deltas.
- `useResize(config)` -- drag with min/max constraints.

`formatKeymap(keymap)` -- formats bindings as hint string (e.g. `↑↓ Move  Enter Select`). Lives in @neftaly/sigil (presentation concern).

## Theme

Two separate contexts (independent concerns):

**Tokens** -- visual styling. Changes appearance, not structure.

```tsx
<ThemeProvider value={{
  colors: { text: "#fff", primary: "#08f", border: "#444", ... },
  borders: { default: "single", focused: "rounded" },
}}>
```

Widget-specific glyphs (checkbox marks, radio dots, etc.) are widget defaults with prop overrides, not theme tokens. Keeps the theme schema stable as widgets are added.

**Mode** -- render strategy. Changes structure, not appearance.

```tsx
<ModeProvider value="default | accessible">
```

Default mode renders character grid with box drawing. Accessible mode renders plain text (consuming the semantic tree directly).

## createRoot

Headless entry point. No surface. For tests and SSR.

```ts
const root = createRoot(80, 24);
root.render(<App />);
root.getPatches();     // Patch[]
root.compose();        // Cell[][]
root.getDB();          // LayoutTree (for reading props, semantics, bounds)
```

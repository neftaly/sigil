# DOM Surface

DOM surface. Output and input are decoupled.

## Surface (Output)

`DOMSurface(container)` -- renders Cell[][] to DOM. Diff-based: consecutive same-style cells become `<span>` runs in `<div>` rows.

## Input Source

`DOMInputSource(container)` -- DOM events → charui events. Pointer events mapped to grid coordinates. Keyboard events forwarded. EditContext (with cross-browser polyfill) handles IME and text composition.

`gridToPixel(container, x, y)` maps grid coordinates to client pixel coordinates. Used by EditContext to position the IME candidate window at the caret.

## Caret

Renders the charui cursor as a DOM caret. DOM surface uses CSS animation for blink -- no JS timer, no React re-render. The decoration system emits the cursor patch; the DOM surface applies the blink animation on the corresponding `<span>`.

## Selection Sync

`syncSelectionToDOM(container, selectionState)` maps charui's internal text selection to a DOM Range on the corresponding `<span>` elements. Enables native context menu -- Copy/Cut/Paste work because the browser sees a real DOM selection.

## ARIA Renderer

Reads `role` and `aria-*` props from LayoutTree nodes. Creates hidden native HTML elements positioned over grid bounds. Screen readers see real form elements.

| Semantic role  | Hidden element           |
|----------------|--------------------------|
| textbox        | `<input type="text">`    |
| spinbutton     | `<input type="number">`  |
| textarea       | `<textarea>`             |
| checkbox       | `<input type="checkbox">`|
| radiogroup     | `<fieldset>` + radios    |
| listbox        | `<select>`               |
| listbox (multi)| `<select multiple>`      |
| button         | `<button>`               |
| dialog         | `<dialog>`               |
| slider         | `<input type="range">`   |
| progressbar    | `role="progressbar"`     |
| status         | `role="status"`          |

Unmapped roles fall through as `role="[value]"` on a generic `<div>`. The table above covers common cases; custom roles work via the standard ARIA attribute.

## Embeds

When a node has an `embed` mount function, the DOM surface calls it with a positioned container element at the node's grid bounds. The surface manages the container's position and size; the mount function manages its content.

`embedReact(node: ReactNode)` helper wraps a React element as a mount function for convenience.

Terminal and 3D surfaces ignore the `embed` prop — children render as fallback cells.

## DOM-only features

These features work on DOM but have no terminal equivalent:

- **Hover** — pointer cursor change, subtle background highlight on interactive widgets
- **Clipboard** — native copy/paste via DOM selection sync
- **IME** — EditContext handles text composition (CJK, accent marks, etc.)
- **Embed** — mount native HTML/React content at grid bounds. Terminal renders fallback children instead.
- **Right-click** — contextmenu event for ContextMenu pattern. No terminal equivalent.
- **CSS animation** — cursor blink, Skeleton shimmer. Terminal gets native cursor blink; Skeleton is static.

All components work on both surfaces. DOM-only features are enhancements, not requirements.

## CharuiCanvas

Composes surface + input source + ARIA renderer. Multiple instances per page are fine.

```tsx
<CharuiCanvas width={80} height={24}>
  <Box border="single"><Text>Hello</Text></Box>
</CharuiCanvas>
```

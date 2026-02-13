# charui

A React renderer for character-grid UIs.

Like React Native uses Yoga to lay out native views, charui uses Yoga to lay out character cells. TUI-inspired, but not TUI-limited: the same components render to a terminal, a browser, or a Three.js scene.

## Architecture

```
React JSX -> Reconciler -> Layout Database -> Cell Grid -> Backend
                           (Yoga->integers)  (Cell[][])    +- toString (tests)
                           queryable via                    +- DOM (browser)
                           hooks                            +- WebGL
                                                            +- Three.js (XR)
```

**Layout database** -- Yoga computes layout, results stored as integer bounds (floor position, ceil size). Hooks query it: `useBounds(ref)` returns `{x, y, w, h}`. Subscriptions via `useSyncExternalStore`. Framework-agnostic.

**Cell grid** -- `Cell[][]`, each cell `{ char, style }`. No layers. Components write characters into their allocated bounds. Rasterizer clips at node boundaries.

**Stateless components** -- Controlled, pure functions. Props in, cells out. State lives in userland.

**Events** -- Pointer events matching React DOM/R3F. Hit testing via tree walk. Integer grid coordinates.

## Comparison

| | Ink | Terminosaurus | charui |
|---|---|---|---|
| Analogy | React for terminals | Better Ink | React Native for char grids |
| Layout engine | Yoga | mono-layout | Yoga |
| Render target | Terminal only | Terminal, XTerm.js | Terminal, DOM, WebGL, Three.js |
| Layout data | Internal | Internal | Reactive database (hooks) |
| Mouse | No | Yes | Yes (pointer events API) |
| Animation | No | No | react-spring compatible |
| 3D/XR | No | No | First-class |

## Packages

- `@charui/core` -- layout database, Yoga integration, cell grid, events
- `@charui/react` -- React reconciler, hooks, `<Box>`/`<Text>` primitives
- `@charui/dom` -- DOM render backend, EditContext input capture
- `@charui/interactions` -- useDrag, useResize, input adapters
- `@charui/components` -- Input, ScrollBox

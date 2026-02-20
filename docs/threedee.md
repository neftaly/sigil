# 3D Surface

Threedee is a tool for visualizing how charui renders things.
It's not yet a valid UI target.

3D surface. Renders the layout tree as an exploded view via React Three Fiber.

## ExplodedScene

Takes a `LayoutTree` directly. Each `LayoutNode` becomes:

- `<mesh>` + `<planeGeometry>` for background
- drei `<Text>` per non-empty cell
- `<Edges>` wireframe per node

Nodes stack along Z by tree depth. `LAYER_SPACING = 0.6`.

```
        ┌───────────────┐
       ╱│  Child 2      │
      ╱ └───────────────┘
     ╱
    ┌─────────────────────┐
   ╱│  Child 1            │
  ╱ └─────────────────────┘
 ╱
┌───────────────────────────┐
│  Root                     │
└───────────────────────────┘
```

`interactive` prop enables OrbitControls.

## ExplodedCanvas

Standalone wrapper. Runs its own headless reconciler + layout.

```tsx
<ExplodedCanvas width={80} height={24} fonts={fontSet}>
  <Box border="single"><Text>Hello</Text></Box>
</ExplodedCanvas>
```

`fonts?: FontSet` -- `{ regular, bold, italic, boldItalic }` as URLs to `.ttf` files.

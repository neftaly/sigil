# Docs Site

Tutorial-style guide with interactive examples. Coffee-table book you can flip through — each page is self-contained and interesting.

## Architecture

```
Static HTML (Astro SSG)
├── Responsive page layout (HTML + CSS with TUI aesthetic)
│   ├── Monospace font, dark theme, box-drawing borders via CSS
│   ├── Prose, code blocks, prop tables — standard HTML
│   └── Responsive, works at any viewport width
│
└── Interactive islands (JavaScript, lazy-loaded)
    └── CharuiCanvas mounting real charui components
        (fixed-width, which is natural for component demos)
```

Page layout is regular responsive HTML/CSS. The TUI aesthetic comes from styling — monospace font, dark background, subtle box-drawing borders, terminal-like color palette. The layout itself reflows for different viewport widths like any website.

Interactive examples are fixed-width `CharuiCanvas` islands within the responsive layout. Fixed width is natural here — you're showing a component at a specific size, like a code playground.

## Page Layout

```
┌──────────────────────────────────────────────────────────┐
│  charui                                                  │
│                                                          │
│  Getting Started  Widgets  Patterns  Kit  Surfaces  API  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  TextField                                               │
│                                                          │
│  Single-line text input with cursor, selection, and      │
│  placeholder support.                                    │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ┌ DOM ┐ Terminal │ Accessible │ 3D │               │  │
│  │ ├─────┴──────────┴────────────┴────┤               │  │
│  │ │ ┌────────────────────────────┐   │               │  │
│  │ │ │Hello world█               │   │ ← live charui  │  │
│  │ │ └────────────────────────────┘   │               │  │
│  │ └──────────────────────────────────┘               │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  <TextField value={name} onChange={setName} width={30} />│
│                                                          │
│  Props: value, onChange, placeholder, width, echoMode    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

The page border and nav are CSS. The interactive example in the middle is a `CharuiCanvas` island. Prose, code blocks, and prop tables are standard HTML — selectable, searchable, responsive.

## Mode Flipper

Each interactive example is wrapped in a `ModeFlipper` — a charui component that renders the same component tree through different surfaces.

```
┌ DOM ┐ Terminal │ Accessible │ 3D │
├─────┴──────────┴────────────┴──────────────────────┐
│                                                    │
│  ┌────────────────────────────┐                    │
│  │Hello world█               │                     │
│  └────────────────────────────┘                    │
│                                                    │
└────────────────────────────────────────────────────┘
```

- **DOM** — live `CharuiCanvas`, interactive (type, click, Tab)
- **Terminal** — `toAnsi` output rendered in a `<pre>` with ANSI-to-CSS color mapping
- **Accessible** — plain text mode rendering
- **3D** — `ExplodedCanvas` showing the layout tree

The flipper is itself a charui component (TabBar + conditional rendering), so it appears as an example of itself on the Components page.

## Page Structure

Tutorial-style, not reference-style. Each page tells a story.

```
Getting Started
  What is charui?
  Hello World (first CharuiCanvas)
  Your first widget
  Handling input

Widgets (atoms)
  Text Entry — TextField, TextArea, NumberInput
  Selection — CheckBox, Toggle, RadioGroup, ListBox, CheckList
  Actions — Button, Slider
  Display — ProgressBar, Spinner, Divider
  Chrome — Panel, TabBar, Dialog

Kit (molecules, v2)
  Data — Table
  Pickers — ColorPicker, DatePicker
  Overlays — Toast, Popover
  Compound — CommandPalette, Autocomplete

Patterns
  Form validation
  Keyboard shortcuts (keymap)
  Focus management
  Scroll
  Embed (native content)
  Theming
  Common recipes — Alert, Skeleton, Tooltip, ContextMenu,
    Splitter, Breadcrumb, Accordion, TreeView

Surfaces
  DOM
  Terminal
  3D
  Building a custom surface

API Reference
  @neftaly/sigil (core, react, widgets)
  @neftaly/sigil/dom
  @neftaly/sigil/terminal
  @neftaly/sigil/threedee
```

## Build

Astro with React islands.

```
site/
  src/
    layouts/
      TuiLayout.astro
    pages/
      index.astro
      getting-started/
      widgets/
      kit/
      patterns/
      surfaces/
      api/
    examples/
      TextFieldExample.tsx    ← live island
      ButtonExample.tsx
      ModeFlipperExample.tsx  ← the flipper demoing itself
      ...
    styles/
      tui.css                 ← monospace, dark theme, borders
  astro.config.ts
```

Examples are hydrated with `client:visible`. The page works without JavaScript — prose, code blocks, and navigation are standard HTML/CSS. JavaScript only adds interactivity to the embedded charui examples.

# Demo: Kitchen Sink

Every core widget on one screen. Not a realistic app — a visual reference for all components and states.

## Screenshot

The TextField is focused (rounded border, primary color, visible cursor). Everything else is unfocused (single border, default color).

```
┌ Kitchen Sink ───────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌ Text Entry ───────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  TextField:    ╭────────────────────────╮   Password: ┌────────────┐  │  │
│  │                │Hello world█            │             │••••••••    │  │  │
│  │                ╰────────────────────────╯             └────────────┘  │  │
│  │                 focused                                               │  │
│  │                                                                       │  │
│  │  Placeholder:  ┌────────────────────────┐                             │  │
│  │                │Enter your name...      │                             │  │
│  │                └────────────────────────┘                             │  │
│  │                                                                       │  │
│  │  NumberInput:  ◀  16  ▶                                               │  │
│  │                                                                       │  │
│  │  TextArea:                                                            │  │
│  │  ┌────────────────────────────────────────────────────────────────┐   │  │
│  │  │Multi-line editing with word wrap. The cursor blinks at the     │   │  │
│  │  │end of the current line.                                        │   │  │
│  │  └────────────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌ Selection ────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  ListBox:             RadioGroup:          CheckBox:                  │  │
│  │  ┌────────────────┐   ( ) Option A         [x] Enabled                │  │
│  │  │  Item 1        │   (o) Option B         [ ] Verbose                │  │
│  │  │  Item 2        │   ( ) Option C         [x] Auto-save              │  │
│  │  │  Item 3        │                                                   │  │
│  │  │  Item 4        │   CheckList:           Toggle:                    │  │
│  │  └────────────────┘   ┌────────────────┐   ●━━ Dark mode              │  │
│  │                       │[x] Alpha       │   ━━○ Animations             │  │
│  │                       │[ ] Beta        │                              │  │
│  │                       │[ ] Gamma       │                              │  │
│  │                       └────────────────┘                              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌ Controls ─────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  Slider:     ├████████████░░░░░░░░┤  64%                              │  │
│  │                                                                       │  │
│  │  Buttons:    ┌──────────┐  ┌──────────┐  ┌──────────┐                 │  │
│  │              │ Save     │  │ Cancel   │  │ Disabled │                 │  │
│  │              └──────────┘  └──────────┘  └──────────┘                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌ Display ──────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  ProgressBar:                                                         │  │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       │  │
│  │  Installing packages                              42%  1.2 MB/s       │  │
│  │                                                                       │  │
│  │  Spinner:    Loading... ⠹                                             │  │
│  │                                                                       │  │
│  │  ────────────────────────────────────────────────────────── divider   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌ Chrome ───────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  ┌ Tabs ┐ Settings │ About │                                          │  │
│  │  ├──────┴──────────┴────────────────────────────────────┐             │  │
│  │  │ Tab content area. Switches on TabBar change.         │             │  │
│  │  └──────────────────────────────────────────────────────┘             │  │
│  │                                                                       │  │
│  │  Embed:                                                               │  │
│  │  ┌──────────────────────┐                                             │  │
│  │  │ [native content]     │  DOM: arbitrary HTML / Terminal: fallback   │  │
│  │  └──────────────────────┘                                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ↑↓ Move  Space Toggle  Enter Confirm  Tab Next  Esc Cancel                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Dialog (overlay)

```
┌──────────────────────────────────────┐
│                                      │
│  ╭ Confirm ───────────────────────╮  │
│  │                                │  │
│  │  Discard unsaved changes?      │  │
│  │                                │  │
│  │  ▸ Yes     No                  │  │
│  ╰────────────────────────────────╯  │
│                                      │
└──────────────────────────────────────┘
```

Dialog is focused (rounded border). It traps focus — Tab cycles within it.

## Components Used

TextField, NumberInput, TextArea, ListBox, RadioGroup, CheckBox, Toggle, CheckList, Slider, Button, ProgressBar, Spinner, Divider, Panel, TabBar, Dialog, embed, formatKeymap.

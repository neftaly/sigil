# Widgets

System toolkit. Standard controls any app needs — one concept per widget, often backed by a single core reducer. Controlled (`value` + `onChange`), stateless. Compatible with React Hook Form, Zod, and TanStack Table.

| Core reducer | Hook | Widgets |
|---|---|---|
| selectionReducer | useSelection | RadioGroup, ListBox, TabBar, CheckList |
| rangeReducer | useRange | NumberInput, Slider |
| textInputReducer | useTextInput | TextField, TextArea |
| (none) | (none) | CheckBox, Toggle, Button, ProgressBar, Spinner, Panel, Dialog, Divider |

Two render modes via theme:
- **default** -- character grid with borders and box drawing
- **accessible** -- plain text via semantic tree

### Visual language

Interactive widgets are visually distinct from display-only content:

```
Unfocused:          Focused:              Disabled:
┌──────────────┐    ╭──────────────╮      ┌──────────────┐
│ content      │    │ content      │      │ content      │
└──────────────┘    ╰──────────────╯      └──────────────┘
 default border      rounded border        dimmed text
 default color       primary color         dimmed border
```

- **Interactive** widgets have borders. Focus changes border style (single → rounded) and color (default → primary). This gives two signals — shape and color — so it works in monochrome too.
- **Display-only** widgets (ProgressBar, Spinner, Divider) have no border and never receive focus.
- **Pressed/active** state inverts fg/bg within the widget's content area.
- On DOM, pointer cursor changes to `pointer` over interactive widgets, and hover shows a subtle background highlight.

Compound components live in kit (v2, see architecture.md).

---

## Entry

### TextField

`useTextInput` → bordered box with cursor.

```
┌────────────────────────────────┐  ╭────────────────────────────────╮
│John Smith                      │  │John Smith█                     │
└────────────────────────────────┘  ╰────────────────────────────────╯
 unfocused                           focused (rounded, primary, cursor)

┌────────────────────────────────┐  ┌────────────────────────────────┐
│Enter your name...              │  │••••••••                        │
└────────────────────────────────┘  └────────────────────────────────┘
 placeholder                        password echo mode
```

Accessible: `Name: John Smith`

| Prop | Type | |
|---|---|---|
| value | string | |
| onChange | function | |
| placeholder | string? | |
| width | number | |
| echoMode | string? | `"normal"` `"password"` `"none"` |
| charLimit | number? | |

### NumberInput

`useRange` → inline stepper.

```
◀  12  ▶        ◀[ 12 ]▶        ◀  0  ▶
 unfocused        focused         at min (◀ dimmed)
```

Accessible: `Health: 12`

| Prop | Type | |
|---|---|---|
| value | number | |
| onChange | function | |
| min | number? | |
| max | number? | |
| step | number? | default 1 |
| precision | number? | decimal places |
| label | string? | |

### TextArea

`useTextInput` → bordered box with scroll + cursor.

```
┌────────────────────────────────┐   ┌────────────────────────────────┐
│Turn 3: Flanked the left side   │   │with terminators. Enemy lost  ▲ │
│with terminators. Enemy lost    │   │2 units.                        │
│2 units.█                       │   │                                │
│                                │   │Deployed reserves on turn 4.  ▼ │
└────────────────────────────────┘   └────────────────────────────────┘
 focused with cursor                  scrolled
```

| Prop | Type | |
|---|---|---|
| value | string | |
| onChange | function | |
| width | number | |
| height | number | |
| placeholder | string? | |
| wrap | boolean? | default true |

---

## Selection

### CheckBox

Inline toggle → `[x]` or `[ ]`.

```
[ ] Shielded     [x] Wounded     [▸] Shielded     [-] Locked
 unchecked        checked         focused           disabled
```

Accessible: `Wounded: yes`

| Prop | Type |
|---|---|
| checked | boolean |
| onChange | function |
| label | string? |
| disabled | boolean? |

### Toggle

Boolean switch. Visual alternative to CheckBox — same interaction, different rendering.

```
━━○ Off       ●━━ On       ●━━ On        ━━○ Off
 unfocused     unfocused    focused        disabled (dimmed)
```

Accessible: `Dark mode: on`

| Prop | Type |
|---|---|
| checked | boolean |
| onChange | function |
| label | string? |
| disabled | boolean? |

### RadioGroup

`useSelection` → inline option list.

```
( ) Attacker        ( ) Attacker
( ) Defender        (●) Defender   ← focused
(o) Observer        ( ) Observer
```

Accessible: `Role: Defender`

| Prop | Type |
|---|---|
| value | string |
| onChange | function |
| options | `{ value, label }[]` |
| disabled | boolean? |

### ListBox

`useSelection` → scrollable list.

```
┌────────────────────────────┐   ╭────────────────────────────╮
│  Iron Legion               │   │  Iron Legion               │
│  Crimson Horde             │   │▸ Crimson Horde             │
│  Starborn                  │   │  Starborn                  │
│  Void Reapers              │   │  Void Reapers              │
└────────────────────────────┘   ╰────────────────────────────╯
 unfocused                        focused (rounded, primary)
```

Accessible:
```
Faction: Crimson Horde
  1. Iron Legion
  2. Crimson Horde (selected)
  3. Starborn
```

| Prop | Type | |
|---|---|---|
| value | string | |
| onChange | function | |
| options | `{ value, label }[]` | |
| height | number? | default 4 |
| disabled | boolean? | |

For type-to-filter, compose `useFilter` + `TextField` + `ListBox`:

```tsx
const filter = useFilter(options);
<TextField value={filter.text} onChange={filter.setText} />
<ListBox options={filter.filtered} value={value} onChange={onChange} />
```

### CheckList

`useSelection` + toggle → scrollable checkbox list.

```
┌────────────────────────────┐
│[x] Flame Sword             │
│[▸] Tower Shield            │
│[x] Grappling Hook          │
│[ ] Smoke Bombs             │
└────────────────────────────┘
```

| Prop | Type | |
|---|---|---|
| value | string[] | |
| onChange | function | |
| options | `{ value, label }[]` | |
| height | number? | |
| limit | number? | max selections |
| disabled | boolean? | |

---

## Action

### Button

Inline activation → bordered label.

```
┌──────────┐     ╭──────────╮     ╭──────────╮
│ Shuffle  │     │ Shuffle  │     │▓Shuffle▓▓│
└──────────┘     ╰──────────╯     ╰──────────╯
 unfocused        focused          pressed
                  (rounded,        (inverted
                   primary color)   content)
```

Accessible: `[Shuffle]`

| Prop | Type |
|---|---|
| label | string |
| onPress | function |
| disabled | boolean? |

### Slider

`useRange` → fill bar with focus indicator.

```
├████████████░░░░░░░░┤  64%     unfocused
╞████████████░░░░░░░░╡  64%     focused (rounded ends, primary color)
├░░░░░░░░░░░░░░░░░░░░┤   0%
├████████████████████ ┤ 100%
```

Accessible: `Morale: 64%`

| Prop | Type | |
|---|---|---|
| value | number | |
| onChange | function | |
| min | number? | default 0 |
| max | number? | default 1 |
| step | number? | |
| width | number | |
| showLabel | boolean? | |

---

## Display

### ProgressBar

Fill container with flexbox children. Fill paints background with inverted colors over the filled region.

```tsx
<ProgressBar value={0.13} width={60}>
  <Text>Downloading update (436)</Text>
  <Text>13%  814kB/s  2m30s</Text>
</ProgressBar>
```

```
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Downloading update (436)                       13%  814kB/s  2m30s
^^^^ inverted ^^^^                           ^^^^ normal ^^^^
```

Accessible: `Downloading update (436) -- 13%`

| Prop | Type | |
|---|---|---|
| value | number | 0 to 1 |
| width | number | |
| children | ReactNode? | |
| filledStyle | CellStyle? | |
| emptyStyle | CellStyle? | |

### Spinner

```
Syncing... ⠋  →  ⠙  →  ⠹  →  ⠸  →  ...
```

Accessible: `Syncing...` (ARIA `role="status"`, `aria-live="polite"` — screen reader announces once, no animation)

| Prop | Type | |
|---|---|---|
| label | string? | |
| frames | string[]? | default braille: `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` |
| interval | number? | ms, default 80 |

---

## Chrome

### Panel

Bordered container with a title.

```
┌ Unit Stats ────────────────────┐
│ Name:  Warchief                │
│ Wounds: ◀[ 6 ]▶                │
│ [x] Leader                     │
└────────────────────────────────┘
```

| Prop | Type |
|---|---|
| title | string? |
| children | ReactNode |
| width | number? |
| border | string? |

### TabBar

`useSelection` → tab strip. Content switching is the caller's concern.

```
┌ Army ┐ Rules │ Score │
├──────┴───────┴───────────────┐
```

| Prop | Type |
|---|---|
| value | string |
| onChange | function |
| tabs | `{ value, label }[]` |

User handles content:

```tsx
<TabBar value={tab} onChange={setTab} tabs={tabs} />
{tab === "army" && <ArmyPanel />}
{tab === "rules" && <RulesPanel />}
```

### Dialog

Composition of `<FocusTrap>` + `<Box z={...}>` + `<Panel>`. Convenience wrapper -- the primitives are independently usable.

```
┌─────────────────────────────┐
│                             │
│  ┌ Confirm ──────────────┐  │
│  │                       │  │
│  │  Shuffle the deck?    │  │
│  │                       │  │
│  │  ▸ Yes     No         │  │
│  └───────────────────────┘  │
│                             │
└─────────────────────────────┘
```

| Prop | Type |
|---|---|
| title | string? |
| children | ReactNode |
| onClose | function? |

Build custom overlays with the primitives directly:

```tsx
// Tooltip (high-z, no focus trap)
<Box z={100} position="absolute" left={x} top={y}>...</Box>

// Inline focus trap (no overlay)
<FocusTrap><WizardStep /></FocusTrap>
```

### Divider

Horizontal or vertical rule.

```
Horizontal:
────────────────────────────────

Vertical (inside a row):
│  Left content  │  Right content  │
```

| Prop | Type |
|---|---|
| direction | `'horizontal'` \| `'vertical'`? |

---

## Patterns

### StatusBar

`formatKeymap(keymap)` (from @neftaly/sigil) formats bindings from `listBindings()`:

```tsx
<Text>{formatKeymap(activeKeymap)}</Text>
// ↑↓ Move   Space Toggle   Enter Confirm   Esc Cancel
```

### Validation

All widgets are controlled (`value` + `onChange`), so validation is the caller's concern. TypeScript types define the form shape; validation rules are plain functions or objects.

**Error states** — widgets accept an `error` prop (string or boolean). Renders a red border and error text below.

```
Valid:                           Error:
┌────────────────────────────┐   ┌────────────────────────────┐
│Aldric Stonehelm            │   │                            │
└────────────────────────────┘   └────────────────────────────┘
                                   Name is required

◀[ 16 ]▶                        ◀[ 25 ]▶
                                   Max 18
```

**TypeScript-first** — define form shape as a type, validation rules as a plain object:

```tsx
type CharacterForm = {
  name: string;
  race: 'human' | 'elf' | 'dwarf' | 'halfling';
  stats: Record<string, number>;
};

const validate = (form: CharacterForm) => ({
  name: form.name.length === 0 ? 'Name is required' : undefined,
  stats: Object.fromEntries(
    Object.entries(form.stats)
      .filter(([, v]) => v < 3 || v > 18)
      .map(([k]) => [k, 'Must be 3–18'])
  ),
});

// Usage
const errors = validate(form);
<TextField value={form.name} onChange={setName} error={errors.name} />
```

**JSON Schema** — for forms defined by data (API-driven, user-generated). Validate with any JSON Schema validator (Ajv, etc.) and map errors to widget `error` props.

**Zod** — optional. Integrates via React Hook Form's `zodResolver`, or standalone. Useful for complex validation (cross-field, async). Not required — plain TypeScript functions work for most cases.

```tsx
// With React Hook Form + Zod
const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  stats: z.record(z.number().min(3).max(18)),
});

const { control, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});

<Controller control={control} name="name" render={({ field, fieldState }) =>
  <TextField {...field} error={fieldState.error?.message} />
} />
```

---

## Kit (molecules, v2)

Molecules — non-trivial composition of atoms. See architecture.md for the split criteria.

### ColorPicker

HTML hex colors and CSS named colors only. Two views via TabBar.

Palette view — grid of named color cells (each cell's `bg` is the color). Spatial nav across cells.

```
┌ Color ──────────────────────────────────────────┐
│                                                 │
│  ┌ Palette ┐ Custom │                           │
│  ├─────────┴────────────────────────────────┐   │
│  │                                          │   │
│  │  (grid of named color cells, each cell   │   │
│  │   is a space with bg = that color)       │   │
│  │                    ▸                     │   │
│  │                                          │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  Selected: coral      #FF7F50   ████            │
│                                 preview         │
└─────────────────────────────────────────────────┘
```

Custom view — RGB sliders + hex text input.

```
┌ Color ──────────────────────────────────────────┐
│                                                 │
│  Palette │ ┌ Custom ┐                           │
│  ────────┴─┤────────────────────────────────┐   │
│  │                                          │   │
│  │  R ├████████████░░░░░░░░┤ 128            │   │
│  │  G ├████░░░░░░░░░░░░░░░░┤  64            │   │
│  │  B ├████████████████████┤ 255            │   │
│  │                                          │   │
│  │  ┌──────────────────────┐                │   │
│  │  │#8040FF               │    ████        │   │
│  │  └──────────────────────┘   preview      │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

Composes: Panel, TabBar, Slider, TextField, Box (bg cells for palette).

### DatePicker

Three views (day → month → year), following Android/iOS date picker patterns. Tapping the header label drills into the next view.

**Day view** — calendar grid. Spatial nav across day cells. Arrows change month.

```
┌─────────────────────────────────────┐
│                                     │
│       ◀  January 2026  ▶            │
│            ↑ tap for months         │
│                                     │
│  Mo  Tu  We  Th  Fr  Sa  Su         │
│               1   2   3   4         │
│   5   6   7   8   9  10  11         │
│  12  13  14  15  16  17  18         │
│  19 ▸20  21  22  23  24  25         │
│  26  27  28  29  30  31             │
│                                     │
└─────────────────────────────────────┘
```

**Month view** — 4x3 grid. Selecting returns to day view. Arrows change year.

```
┌─────────────────────────────────────┐
│                                     │
│            ◀  2026  ▶               │
│             ↑ tap for years         │
│                                     │
│  ▸Jan   Feb   Mar   Apr             │
│   May   Jun   Jul   Aug             │
│   Sep   Oct   Nov   Dec             │
│                                     │
└─────────────────────────────────────┘
```

**Year view** — scrollable list. Selecting returns to month view.

```
┌─────────────────────────────────────┐
│                                     │
│   2023                              │
│   2024                              │
│   2025                              │
│ ▸ 2026                              │
│   2027                              │
│   2028                              │
│   2029                              │
│                                     │
└─────────────────────────────────────┘
```

**With time** — TabBar switches between date and time. Time uses NumberInput spinners.

```
┌─────────────────────────────────────┐
│  ┌ Date ┐ Time │                    │
│  ├──────┴──────────────────────┐    │
│  │  ... calendar grid ...      │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Date │ ┌ Time ┐                    │
│  ─────┴─┤──────────────────────┐    │
│  │  Hour:   ◀[ 14 ]▶           │    │
│  │  Minute: ◀[ 30 ]▶           │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

Composes: Panel, TabBar, ListBox (years), NumberInput (time), Button (arrows), Box (day/month grids with spatial nav).

### CommandPalette

Fuzzy-find actions. Dialog + TextField + filtered ListBox.

```
┌─────────────────────────────────────┐
│ > add un█                           │
│ ┌─────────────────────────────────┐ │
│ │ ▸ Add Unit                      │ │
│ │   Add Unit to Reserve           │ │
│ │   Undo Last Action              │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

No results:

```
┌─────────────────────────────────────┐
│ > xyzzy█                            │
│                                     │
│   No matching actions               │
│                                     │
└─────────────────────────────────────┘
```

Composes: Dialog, TextField, ListBox, useFilter.

### Autocomplete

TextField with suggestions dropdown. Popover positioned below the input.

```
Typing:                             No results:
┌────────────────────────────────┐  ┌────────────────────────────────┐
│Iron Leg█                       │  │xyzzy█                          │
├────────────────────────────────┤  ├────────────────────────────────┤
│ ▸ Iron Legion                  │  │  No matches                    │
│   Iron Guard                   │  └────────────────────────────────┘
│   Iron Horde                   │
└────────────────────────────────┘  Empty (no dropdown):
                                    ┌────────────────────────────────┐
                                    │█                               │
                                    └────────────────────────────────┘
```

Dropdown only appears after typing. Composes: TextField, ListBox, useFilter, Popover.

### Toast

Auto-dismissing notification. High-z patch, no focus trap. Timer unmounts it.

```
Single:              ┌─────────────────────────┐
                     │  Unit added to roster   │
                     └─────────────────────────┘

Stacked:             ┌─────────────────────────┐
                     │  Settings saved         │
                     └─────────────────────────┘
                     ┌─────────────────────────┐
                     │  Unit added to roster   │
                     └─────────────────────────┘
```

Multiple toasts stack vertically. Not interactive (no focus). Composes: Box (high z), Text, timer.

### Popover

Positioning primitive. High-z Box anchored to a trigger element's grid bounds. Used by Autocomplete, Tooltip, ContextMenu.

```
  ┌──────────┐
  │ Rename   │           ┌────────────────────────┐
  │ Delete   │           │ Tip: press Tab to move │
  │ Inspect  │           │ between fields.        │
  └──────────┘           └────────────────────────┘
   context menu               tooltip
```

Not a widget — a positioning utility. Takes anchor NodeId + placement (above/below/left/right), computes origin from layout bounds, renders children in a high-z Box.

### Table

Thin rendering layer over TanStack Table. Column headers, sortable, resizable columns.

```
┌──────────────────┬───────┬─────┐
│ Unit           ▼ │  Pts  │  W  │  ← ▼ = sorted descending
├──────────────────┼───────┼─────┤
│ Strike Team      │  200  │  2  │
│ Siege Golem      │  150  │  8  │
│ Shield Wall      │  100  │  1  │
├──────────────────┼───────┼─────┤
│ Total            │  450  │     │
└──────────────────┴───────┴─────┘
```

Empty:

```
┌──────────────────┬───────┬─────┐
│ Unit             │  Pts  │  W  │
├──────────────────┼───────┼─────┤
│                                │
│         No data                │
│                                │
└──────────────────┴───────┴─────┘
```

Paginated:

```
│ ...                            │
├──────────────────┼───────┼─────┤
│              Page 2 of 5       │
│           ◀  1  2  3  ▶        │
└────────────────────────────────┘
```

Composes: Box (grid layout), Text, useResize (column widths), Button (pagination). TanStack Table handles sorting, filtering, pagination logic.

### Alert

`<Panel>` + icon + optional `<Button>`. Set border color by severity.

```
┌ ℹ ───────────────────────────────────────────┐
│  New version available.          [Update]    │
└──────────────────────────────────────────────┘
```

### Skeleton

`<Box>` with animated background fill (CSS animation on DOM, static fill on terminal).

```
┌────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░   │
│ ░░░░░░░░░░░░░░░░           │
└────────────────────────────┘
```

### Tooltip

`<Popover>` that shows on focus/hover with a delay. Dismisses on blur/leave.

```
              ┌───────────────────────┐
  [▸ Delete]  │ Remove unit from      │
              │ roster permanently.   │
              └───────────────────────┘
```

### ContextMenu

`<Popover>` + `<ListBox>` + `<FocusTrap>`. Triggered by right-click or menu key.

```
         ┌──────────┐
         │ Rename   │
         │ Delete   │
         │ Inspect  │
         └──────────┘
```

### Splitter

Two `<Box>` children + `useDrag` on the divider handle.

```
┌──────────────────│──────────────────┐
│  Left pane       │  Right pane      │
└──────────────────│──────────────────┘
```

### Breadcrumb

Row of `<Button>` with `" / "` separators.

```
 Home / Projects / Settings / Users
```

### Accordion

`<Panel>` for open section + `<Button>` headers + `selectionReducer`.

```
┌ General ────────────────────────────┐
│  Name: Shield Wall                  │
│  Points: 100                        │
└─────────────────────────────────────┘
▸ Equipment
▸ Abilities
▸ Notes
```

### TreeView

Flat `<ListBox>` with indent levels + expand/collapse state.

```
  ▾ src/
    ▾ components/
        App.tsx
    ▸ hooks/
    package.json
```

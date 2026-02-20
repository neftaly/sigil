# Demo: File Browser

File picker over the Web File System Access API. Covers async loading patterns, keymap wiring, and widgets not shown in the other demos.

## Screenshot

```
┌ File Browser ───────────────────────────────────────────────────┐
│                                                                 │
│  project/src                                    [Open Folder]   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │   components/                                            │   │
│  │   hooks/                                                 │   │
│  │   utils/                                                 │   │
│  │ ▸ App.tsx                                       3.2 KB   │   │
│  │   index.ts                                        214 B  │   │
│  │   types.ts                                      1.1 KB   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                       │
│  │ Select   │  │ Up       │  │ Cancel   │                       │
│  └──────────┘  └──────────┘  └──────────┘                       │
│                                                                 │
│  ↑↓ Navigate   Enter Open   Backspace Up   Esc Cancel           │
└─────────────────────────────────────────────────────────────────┘
```

Loading state:

```
│  Loading... ⠹                                                   │
```

## Notes

- `FileSystemDirectoryHandle` works for both the File System Access API (real local files) and the Origin Private File System (sandboxed browser storage).
- Directories sort before files, then alphabetical.
- Enter on a directory navigates into it. Enter on a file selects it.
- For terminal, same component works over an `fs`-backed adapter matching the `FileSystemDirectoryHandle` interface.

## Components Used

Panel, ListBox, Button, Spinner, Text, Box, useKeymap, formatKeymap.

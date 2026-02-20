# Terminal Surface

ANSI surface. Output only (input sourcing is separate -- stdin, WebSocket, etc.).

## toAnsi

`toAnsi(grid: Cell[][])` returns a string.

- Truecolor always: `\x1b[38;2;r;g;bm` (fg), `\x1b[48;2;r;g;bm` (bg)
- Bold `\x1b[1m`, italic `\x1b[3m`, underline `\x1b[4m`
- Groups consecutive same-style cells into one escape sequence
- Skips continuation cells (wide characters)
- `\r\n` line endings

No detection, no degradation.

## Cursor

When a text field is focused, position the terminal's native cursor at the caret with `\x1b[row;colH`. The terminal handles blink natively. When no text field is focused, hide the cursor with `\x1b[?25l`. This gives terminal apps native cursor behavior for free.

## TerminalCanvas

Orchestrator for terminal apps. Single instance (one stdin, one stdout).

1. Enters alternate screen buffer (`\x1b[?1049h`)
2. Enters raw mode, enables SGR mouse, bracketed paste
3. Creates root, starts render loop
4. On exit: restores terminal state (cursor, screen buffer, raw mode)

Registers cleanup handlers for SIGINT, SIGTERM, and uncaughtException so the terminal is always restored, even on crash.

## Known limitations

- **Node.js only.** Uses `process.stdin`/`process.stdout` and `tty.ReadStream`. Deno and Bun have different APIs.
- **Single instance.** One TerminalCanvas per process.
- **No clipboard.** Ctrl+C is SIGINT. OSC 52 clipboard has spotty terminal support. Copy/paste is a DOM-only feature.
- **No hover.** Mouse tracking provides clicks and drags, not hover. Hover states are DOM-only.
- **No IME.** Terminals in raw mode don't support Input Method Editor composition.
- **Mouse scroll varies.** Some terminals send scroll events, some don't. Scroll-heavy UIs work best on DOM.
- **Terminal multiplexers** (tmux, screen) may intercept mouse events or mangle key sequences.
- **LTR only.** RTL/bidirectional text is not supported in v1.

## Example

```ts
const patches = root.getPatches();
const grid = compose(patches, 80, 24);
process.stdout.write(toAnsi(grid));
```

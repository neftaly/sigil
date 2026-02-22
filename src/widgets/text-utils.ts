// --- Surrogate-pair-aware cursor movement helpers ---

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}

/** Number of code units to move forward from position `pos`, skipping surrogate pairs. */
export function moveForwardCount(str: string, pos: number): number {
  if (pos >= str.length) return 0;
  if (
    pos + 1 < str.length &&
    isHighSurrogate(str.charCodeAt(pos)) &&
    isLowSurrogate(str.charCodeAt(pos + 1))
  ) {
    return 2;
  }
  return 1;
}

/** Number of code units to move backward from position `pos`, skipping surrogate pairs. */
export function moveBackCount(str: string, pos: number): number {
  if (pos <= 0) return 0;
  if (
    pos >= 2 &&
    isLowSurrogate(str.charCodeAt(pos - 1)) &&
    isHighSurrogate(str.charCodeAt(pos - 2))
  ) {
    return 2;
  }
  return 1;
}

/** Snap a code-unit position to a valid character boundary (never inside a surrogate pair). */
export function snapToCharBoundary(str: string, pos: number): number {
  if (pos > 0 && pos < str.length && isLowSurrogate(str.charCodeAt(pos))) {
    return pos - 1;
  }
  return pos;
}

/** Find the position of the previous word boundary (for Ctrl+Left / Ctrl+Backspace). */
export function wordBoundaryLeft(str: string, pos: number): number {
  let p = pos;
  // Skip whitespace before cursor
  while (p > 0 && str[p - 1] === " ") p--;
  // Skip non-whitespace (the word)
  while (p > 0 && str[p - 1] !== " ") p--;
  return Math.max(0, p);
}

/** Find the position of the next word boundary (for Ctrl+Right / Ctrl+Delete). */
export function wordBoundaryRight(str: string, pos: number): number {
  let p = pos;
  // Skip non-whitespace (current word)
  while (p < str.length && str[p] !== " ") p++;
  // Skip whitespace after word
  while (p < str.length && str[p] === " ") p++;
  return Math.min(str.length, p);
}

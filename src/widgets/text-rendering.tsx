import React from "react";
import { Text } from "../react/primitives.tsx";

/**
 * Render a single line of text with cursor and selection highlighting.
 * Batches consecutive characters with the same style into single <Text> segments.
 */
export function renderStyledLine(opts: {
  lineText: string;
  innerWidth: number;
  charOffsetBase: number;
  cursorCol: number | null;
  selStart: number;
  selEnd: number;
  textColor: string;
  primaryColor: string;
}): React.ReactNode[] {
  const { lineText, innerWidth, charOffsetBase, cursorCol, selStart, selEnd, textColor, primaryColor } = opts;
  const hasSelection = selStart >= 0 && selStart !== selEnd;

  const segments: React.ReactNode[] = [];
  let segStart = 0;

  for (let ch = 0; ch < innerWidth; ch++) {
    const charOffset = charOffsetBase + ch;
    const isCursor = cursorCol !== null && ch === cursorCol;
    const isSelected = hasSelection && charOffset >= selStart && charOffset < selEnd;

    let charColor = textColor;
    let charBg: string | undefined;
    let charBold = false;

    if (isCursor) {
      charColor = primaryColor;
      charBg = textColor;
      charBold = true;
    } else if (isSelected) {
      charColor = primaryColor;
      charBg = textColor;
    }

    // Check if next character has same styling to batch them.
    const nextCharOffset = charOffsetBase + ch + 1;
    const nextIsCursor = cursorCol !== null && (ch + 1) === cursorCol;
    const nextIsSelected = hasSelection && nextCharOffset >= selStart && nextCharOffset < selEnd;

    let nextCharColor = textColor;
    let nextCharBg: string | undefined;
    let nextCharBold = false;
    if (nextIsCursor) {
      nextCharColor = primaryColor;
      nextCharBg = textColor;
      nextCharBold = true;
    } else if (nextIsSelected) {
      nextCharColor = primaryColor;
      nextCharBg = textColor;
    }

    const styleChanged = ch === innerWidth - 1 ||
      charColor !== nextCharColor ||
      charBg !== nextCharBg ||
      charBold !== nextCharBold;

    if (styleChanged) {
      const segText = lineText.slice(segStart, ch + 1);
      if (charBg) {
        segments.push(
          <Text key={`seg-${segStart}`} color={charColor} backgroundColor={charBg} bold={charBold || undefined}>
            {segText}
          </Text>,
        );
      } else {
        segments.push(
          <Text key={`seg-${segStart}`} color={charColor}>
            {segText}
          </Text>,
        );
      }
      segStart = ch + 1;
    }
  }

  return segments;
}

import stringWidth from "string-width";

import type { LayoutNode } from "./database.ts";
import type { TextNodeProps } from "./types.ts";

export type WrapMode = "nowrap" | "wrap";

/** Measure text dimensions for Yoga's measureFunc. */
export function measureText(
  text: string,
  wrapMode: WrapMode,
  maxWidth: number,
): { width: number; height: number } {
  if (text === "") {
    return { width: 0, height: 0 };
  }

  if (wrapMode === "nowrap") {
    return { width: stringWidth(text), height: 1 };
  }

  // Word wrap: break at spaces/hyphens
  const lines = wrapText(text, maxWidth);
  const widestLine = Math.max(...lines.map((line) => stringWidth(line)));
  return { width: widestLine, height: lines.length };
}

/** Set Yoga's measureFunc on a text node so layout can measure it. */
export function setTextMeasureFunc(node: LayoutNode, props: TextNodeProps) {
  const content = props.content ?? "";
  const wrapMode: WrapMode = props.wrap ? "wrap" : "nowrap";

  node.yogaNode.setMeasureFunc((maxWidth, widthMode) => {
    const width = widthMode === 0 ? Infinity : maxWidth;
    const measured = measureText(content, wrapMode, width);
    return { width: measured.width, height: measured.height };
  });

  // Mark the node dirty so Yoga knows to re-measure
  if (node.yogaNode.getChildCount() === 0) {
    node.yogaNode.markDirty();
  }
}

/** Wrap text at word boundaries within maxWidth. */
export function wrapText(text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) {
    return [""];
  }

  const words = text.split(/(\s+)/);
  const lines: string[] = [];
  let currentLine = "";
  let currentWidth = 0;

  for (const word of words) {
    const wordWidth = stringWidth(word);

    if (currentWidth === 0) {
      // First word on line — always add it (even if wider than maxWidth)
      currentLine = word;
      currentWidth = wordWidth;
    } else if (currentWidth + wordWidth <= maxWidth) {
      currentLine += word;
      currentWidth += wordWidth;
    } else {
      // Word doesn't fit, start new line
      lines.push(currentLine);
      // Skip leading whitespace on new line
      if (word.trim() === "") {
        currentLine = "";
        currentWidth = 0;
      } else {
        currentLine = word;
        currentWidth = wordWidth;
      }
    }
  }

  if (currentLine !== "" || lines.length === 0) {
    lines.push(currentLine);
  }

  return lines;
}

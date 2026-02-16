import { type ReactNode, createElement } from "react";

export interface ProgressProps {
  value: number;
  width: number;
  filledChar?: string;
  emptyChar?: string;
  filledColor?: string;
  emptyColor?: string;
  showLabel?: boolean;
}

export function Progress({
  value,
  width,
  filledChar = "\u2588",
  emptyChar = "\u2591",
  filledColor,
  emptyColor = "#666",
  showLabel,
}: ProgressProps): ReactNode {
  const clamped = Math.max(0, Math.min(1, value));
  const label = showLabel ? ` ${Math.round(clamped * 100)}%` : "";
  const barWidth = width - label.length;
  const filledCount = Math.round(clamped * barWidth);
  const emptyCount = barWidth - filledCount;

  return createElement(
    "box",
    { flexDirection: "row" },
    createElement("text", {
      content: filledChar.repeat(filledCount),
      color: filledColor,
    }),
    createElement("text", {
      content: emptyChar.repeat(emptyCount),
      color: emptyColor,
    }),
    showLabel
      ? createElement("text", { content: label })
      : null,
  );
}

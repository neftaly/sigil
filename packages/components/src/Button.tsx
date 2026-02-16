import { type ReactNode, createElement, useState } from "react";

import type { KeyEvent, PointerEvent } from "@charui/core";

export interface ButtonProps {
  children: string;
  onPress?: () => void;
  disabled?: boolean;
  width?: number;
  color?: string;
  backgroundColor?: string;
}

export function Button({
  children,
  onPress,
  disabled,
  width,
  color,
  backgroundColor,
}: ButtonProps): ReactNode {
  const [pressed, setPressed] = useState(false);

  const handlePointerDown = (_event: PointerEvent) => {
    if (disabled) {
      return;
    }
    setPressed(true);
  };

  const handlePointerUp = (_event: PointerEvent) => {
    if (!pressed) {
      return;
    }
    setPressed(false);
    onPress?.();
  };

  const handleKeyDown = (event: KeyEvent) => {
    if (disabled) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      setPressed(true);
    }
  };

  const handleKeyUp = (event: KeyEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      if (pressed) {
        setPressed(false);
        onPress?.();
      }
    }
  };

  const buttonWidth = width ?? children.length + 4;

  return createElement(
    "box",
    {
      border: true,
      width: buttonWidth,
      height: 3,
      focusable: !disabled,
      cursor: disabled ? undefined : "pointer",
      backgroundColor,
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
      onKeyDown: handleKeyDown,
      onKeyUp: handleKeyUp,
    },
    createElement("text", {
      content: ` ${children} `,
      color: disabled ? "#666" : color,
      bold: pressed,
    }),
  );
}

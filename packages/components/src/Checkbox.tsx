import { type ReactNode, createElement } from "react";

import type { KeyEvent, PointerEvent } from "@charui/core";

export interface CheckboxProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  color?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
  color,
}: CheckboxProps): ReactNode {
  const toggle = () => {
    if (disabled) { return; }
    onChange?.(!checked);
  };

  const handlePointerDown = (_event: PointerEvent) => toggle();

  const handleKeyDown = (event: KeyEvent) => {
    if (event.key === " ") { toggle(); }
  };

  const indicator = checked ? "[x]" : "[ ]";
  const content = label ? `${indicator} ${label}` : indicator;

  return createElement("text", {
    content,
    focusable: !disabled,
    cursor: disabled ? undefined : "pointer",
    color: disabled ? "#666" : color,
    bold: checked,
    onPointerDown: handlePointerDown,
    onKeyDown: handleKeyDown,
  });
}

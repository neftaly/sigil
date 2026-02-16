import {
  type ReactNode,
  createContext,
  createElement,
  useContext,
} from "react";

import type { KeyEvent, PointerEvent } from "@charui/core";

export interface RadioGroupProps {
  value: string;
  onChange?: (value: string) => void;
  children: ReactNode;
}

export interface RadioProps {
  value: string;
  label?: string;
  disabled?: boolean;
  color?: string;
}

const RadioGroupContext = createContext<{
  value: string;
  onChange?: (value: string) => void;
} | null>(null);

export function RadioGroup({
  value,
  onChange,
  children,
}: RadioGroupProps): ReactNode {
  return createElement(
    RadioGroupContext.Provider,
    { value: { value, onChange } },
    createElement("box", { flexDirection: "column" }, children),
  );
}

export function Radio({
  value,
  label,
  disabled,
  color,
}: RadioProps): ReactNode {
  const group = useContext(RadioGroupContext);
  const selected = group?.value === value;

  const select = () => {
    if (disabled) {
      return;
    }
    group?.onChange?.(value);
  };

  const handlePointerDown = (_event: PointerEvent) => {
    select();
  };

  const handleKeyDown = (event: KeyEvent) => {
    if (event.key === " " || event.key === "Enter") {
      select();
    }
  };

  const indicator = selected ? "(o)" : "( )";
  const content = label ? `${indicator} ${label}` : indicator;

  return createElement("text", {
    content,
    focusable: !disabled,
    cursor: disabled ? undefined : "pointer",
    color: disabled ? "#666" : color,
    bold: selected,
    onPointerDown: handlePointerDown,
    onKeyDown: handleKeyDown,
  });
}

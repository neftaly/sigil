import { type ReactNode, createElement } from "react";

import type {
  BorderStyle,
  EventHandlerProps,
  LayoutProps,
  StyleProps,
} from "../core/index.ts";

export interface BoxProps extends LayoutProps, EventHandlerProps, StyleProps {
  children?: ReactNode;
  borderStyle?: BorderStyle;
  /** ARIA role for the node (read by the ARIA manager). */
  role?: string;
  /** When true, dims content, blocks input, and sets aria-disabled. */
  disabled?: boolean;
  /** Error message shown below the widget. */
  error?: string;
}

export interface TextProps extends EventHandlerProps, StyleProps {
  children?: ReactNode;
  wrap?: boolean;
}

export function Box({ children, ...props }: BoxProps): ReactNode {
  return createElement("box", props, children);
}

export function Text({ children, ...props }: TextProps): ReactNode {
  return createElement("text", props, children);
}

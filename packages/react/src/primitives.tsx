import { type ReactNode, createElement } from "react";

import type {
  BorderStyle,
  EventHandlerProps,
  LayoutProps,
  StyleProps,
} from "@charui/core";

export type EventProps = EventHandlerProps;

export interface BoxProps extends LayoutProps, EventHandlerProps, StyleProps {
  children?: ReactNode;
  borderStyle?: BorderStyle;
}

export interface TextProps extends EventHandlerProps, StyleProps {
  children?: string;
  wrap?: boolean;
}

export function Box({ children, ...props }: BoxProps): ReactNode {
  return createElement("box", props, children);
}

export function Text({ children, ...props }: TextProps): ReactNode {
  return createElement("text", { ...props, content: children ?? "" });
}

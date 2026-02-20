import type { BorderStyle } from "./borders.ts";
import type {
  FocusEvent,
  KeyEvent,
  PointerEvent,
  TextUpdateEvent,
} from "./events.ts";

export interface EventHandlerProps {
  onPointerDown?: (event: PointerEvent) => void;
  onPointerUp?: (event: PointerEvent) => void;
  onPointerMove?: (event: PointerEvent) => void;
  onPointerEnter?: (event: PointerEvent) => void;
  onPointerLeave?: (event: PointerEvent) => void;
  onPointerDownCapture?: (event: PointerEvent) => void;
  onPointerUpCapture?: (event: PointerEvent) => void;
  onPointerMoveCapture?: (event: PointerEvent) => void;
  onPointerCancel?: (event: PointerEvent) => void;
  onPointerCancelCapture?: (event: PointerEvent) => void;
  onKeyDown?: (event: KeyEvent) => void;
  onKeyUp?: (event: KeyEvent) => void;
  onKeyDownCapture?: (event: KeyEvent) => void;
  onKeyUpCapture?: (event: KeyEvent) => void;
  onTextUpdate?: (event: TextUpdateEvent) => void;
  onTextUpdateCapture?: (event: TextUpdateEvent) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
  focusable?: boolean;
  tabIndex?: number;
  cursor?: string;
}

export interface LayoutProps {
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number;
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  justifyContent?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around"
    | "space-evenly";
  padding?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  margin?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  border?: boolean;
  borderStyle?: BorderStyle;
  position?: "relative" | "absolute";
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}

export interface StyleProps {
  color?: string;
  backgroundColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface BoxNodeProps
  extends LayoutProps, EventHandlerProps, StyleProps {}

export interface TextNodeProps extends EventHandlerProps, StyleProps {
  content?: string;
  wrap?: boolean;
}

export type NodeProps = BoxNodeProps | TextNodeProps;

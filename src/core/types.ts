import type { BorderStyle } from "./borders.ts";
import type {
  FocusEvent,
  KeyEvent,
  PointerEvent,
  TextUpdateEvent,
} from "./events.ts";

export interface EventHandlerProps {
  onPointerDown?: (event: PointerEvent) => boolean | void;
  onPointerUp?: (event: PointerEvent) => boolean | void;
  onPointerMove?: (event: PointerEvent) => boolean | void;
  onPointerEnter?: (event: PointerEvent) => boolean | void;
  onPointerLeave?: (event: PointerEvent) => boolean | void;
  onPointerDownCapture?: (event: PointerEvent) => boolean | void;
  onPointerUpCapture?: (event: PointerEvent) => boolean | void;
  onPointerMoveCapture?: (event: PointerEvent) => boolean | void;
  onPointerCancel?: (event: PointerEvent) => boolean | void;
  onPointerCancelCapture?: (event: PointerEvent) => boolean | void;
  onKeyDown?: (event: KeyEvent) => boolean | void;
  onKeyUp?: (event: KeyEvent) => boolean | void;
  onKeyDownCapture?: (event: KeyEvent) => boolean | void;
  onKeyUpCapture?: (event: KeyEvent) => boolean | void;
  onTextUpdate?: (event: TextUpdateEvent) => boolean | void;
  onTextUpdateCapture?: (event: TextUpdateEvent) => boolean | void;
  onFocus?: (event: FocusEvent) => boolean | void;
  onBlur?: (event: FocusEvent) => boolean | void;
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
  /** Horizontal scroll offset (default 0). */
  scrollX?: number;
  /** Vertical scroll offset (default 0). */
  scrollY?: number;
  /** Clipping behavior: "visible" = no clip (default), "hidden" = clip to bounds, "scroll" = clip + show scroll indicators. */
  overflow?: "visible" | "hidden" | "scroll";
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

import yoga from "yoga-layout";

import type { LayoutNode } from "./database.ts";
import type { LayoutProps, NodeProps } from "./types.ts";

const FLEX_DIRECTION_MAP = {
  row: yoga.FLEX_DIRECTION_ROW,
  column: yoga.FLEX_DIRECTION_COLUMN,
  "row-reverse": yoga.FLEX_DIRECTION_ROW_REVERSE,
  "column-reverse": yoga.FLEX_DIRECTION_COLUMN_REVERSE,
} satisfies Record<string, number>;

const ALIGN_MAP = {
  "flex-start": yoga.ALIGN_FLEX_START,
  center: yoga.ALIGN_CENTER,
  "flex-end": yoga.ALIGN_FLEX_END,
  stretch: yoga.ALIGN_STRETCH,
} satisfies Record<string, number>;

const JUSTIFY_MAP = {
  "flex-start": yoga.JUSTIFY_FLEX_START,
  center: yoga.JUSTIFY_CENTER,
  "flex-end": yoga.JUSTIFY_FLEX_END,
  "space-between": yoga.JUSTIFY_SPACE_BETWEEN,
  "space-around": yoga.JUSTIFY_SPACE_AROUND,
  "space-evenly": yoga.JUSTIFY_SPACE_EVENLY,
} satisfies Record<string, number>;

/**
 * Apply layout props to a Yoga node.
 * Pure layout logic -- no React dependency.
 * Accepts any NodeProps; non-layout props are ignored.
 */
export function applyYogaStyles(node: LayoutNode, props: NodeProps) {
  const { yogaNode } = node;

  // Safe to access layout fields: TextNodeProps simply won't have them.
  const layoutProps = props as Partial<LayoutProps>;

  if (layoutProps.width !== undefined) {
    yogaNode.setWidth(layoutProps.width);
  }
  if (layoutProps.height !== undefined) {
    yogaNode.setHeight(layoutProps.height);
  }
  if (layoutProps.minWidth !== undefined) {
    yogaNode.setMinWidth(layoutProps.minWidth);
  }
  if (layoutProps.minHeight !== undefined) {
    yogaNode.setMinHeight(layoutProps.minHeight);
  }
  if (layoutProps.maxWidth !== undefined) {
    yogaNode.setMaxWidth(layoutProps.maxWidth);
  }
  if (layoutProps.maxHeight !== undefined) {
    yogaNode.setMaxHeight(layoutProps.maxHeight);
  }

  if (layoutProps.flexGrow !== undefined) {
    yogaNode.setFlexGrow(layoutProps.flexGrow);
  }
  if (layoutProps.flexShrink !== undefined) {
    yogaNode.setFlexShrink(layoutProps.flexShrink);
  }
  if (layoutProps.flexBasis !== undefined) {
    yogaNode.setFlexBasis(layoutProps.flexBasis);
  }
  if (layoutProps.flexDirection !== undefined) {
    const direction = FLEX_DIRECTION_MAP[layoutProps.flexDirection];
    if (direction !== undefined) {
      yogaNode.setFlexDirection(direction);
    }
  }

  if (layoutProps.alignItems !== undefined) {
    const align = ALIGN_MAP[layoutProps.alignItems];
    if (align !== undefined) {
      yogaNode.setAlignItems(align);
    }
  }

  if (layoutProps.justifyContent !== undefined) {
    const justify = JUSTIFY_MAP[layoutProps.justifyContent];
    if (justify !== undefined) {
      yogaNode.setJustifyContent(justify);
    }
  }

  if (layoutProps.padding !== undefined) {
    yogaNode.setPadding(yoga.EDGE_ALL, layoutProps.padding);
  }
  if (layoutProps.paddingTop !== undefined) {
    yogaNode.setPadding(yoga.EDGE_TOP, layoutProps.paddingTop);
  }
  if (layoutProps.paddingBottom !== undefined) {
    yogaNode.setPadding(yoga.EDGE_BOTTOM, layoutProps.paddingBottom);
  }
  if (layoutProps.paddingLeft !== undefined) {
    yogaNode.setPadding(yoga.EDGE_LEFT, layoutProps.paddingLeft);
  }
  if (layoutProps.paddingRight !== undefined) {
    yogaNode.setPadding(yoga.EDGE_RIGHT, layoutProps.paddingRight);
  }

  if (layoutProps.margin !== undefined) {
    yogaNode.setMargin(yoga.EDGE_ALL, layoutProps.margin);
  }
  if (layoutProps.marginTop !== undefined) {
    yogaNode.setMargin(yoga.EDGE_TOP, layoutProps.marginTop);
  }
  if (layoutProps.marginBottom !== undefined) {
    yogaNode.setMargin(yoga.EDGE_BOTTOM, layoutProps.marginBottom);
  }
  if (layoutProps.marginLeft !== undefined) {
    yogaNode.setMargin(yoga.EDGE_LEFT, layoutProps.marginLeft);
  }
  if (layoutProps.marginRight !== undefined) {
    yogaNode.setMargin(yoga.EDGE_RIGHT, layoutProps.marginRight);
  }

  if (layoutProps.border) {
    yogaNode.setBorder(yoga.EDGE_ALL, 1);
  }

  if (layoutProps.position === "absolute") {
    yogaNode.setPositionType(yoga.POSITION_TYPE_ABSOLUTE);
    if (layoutProps.top !== undefined) {
      yogaNode.setPosition(yoga.EDGE_TOP, layoutProps.top);
    }
    if (layoutProps.left !== undefined) {
      yogaNode.setPosition(yoga.EDGE_LEFT, layoutProps.left);
    }
    if (layoutProps.right !== undefined) {
      yogaNode.setPosition(yoga.EDGE_RIGHT, layoutProps.right);
    }
    if (layoutProps.bottom !== undefined) {
      yogaNode.setPosition(yoga.EDGE_BOTTOM, layoutProps.bottom);
    }
  }

  if (
    layoutProps.overflow === "hidden" ||
    layoutProps.overflow === "scroll"
  ) {
    yogaNode.setOverflow(yoga.OVERFLOW_HIDDEN);
  } else if (layoutProps.overflow === "visible") {
    yogaNode.setOverflow(yoga.OVERFLOW_VISIBLE);
  }
}

import type { Database, LayoutNode } from "./database.ts";
import type { LayoutProps, NodeProps } from "./types.ts";

/**
 * Apply layout props to a Yoga node.
 * Pure layout logic -- no React dependency.
 * Accepts any NodeProps; non-layout props are ignored.
 */
export function applyYogaStyles(
  database: Database,
  node: LayoutNode,
  props: NodeProps,
) {
  const { yogaNode } = node;
  const { yoga } = database;

  // Safe to access layout fields: TextNodeProps simply won't have them.
  const lp = props as Partial<LayoutProps>;

  if (lp.width !== undefined) {
    yogaNode.setWidth(lp.width);
  }
  if (lp.height !== undefined) {
    yogaNode.setHeight(lp.height);
  }
  if (lp.minWidth !== undefined) {
    yogaNode.setMinWidth(lp.minWidth);
  }
  if (lp.minHeight !== undefined) {
    yogaNode.setMinHeight(lp.minHeight);
  }
  if (lp.maxWidth !== undefined) {
    yogaNode.setMaxWidth(lp.maxWidth);
  }
  if (lp.maxHeight !== undefined) {
    yogaNode.setMaxHeight(lp.maxHeight);
  }

  if (lp.flexGrow !== undefined) {
    yogaNode.setFlexGrow(lp.flexGrow);
  }
  if (lp.flexShrink !== undefined) {
    yogaNode.setFlexShrink(lp.flexShrink);
  }
  if (lp.flexBasis !== undefined) {
    yogaNode.setFlexBasis(lp.flexBasis);
  }
  if (lp.flexDirection !== undefined) {
    const directionMap: Record<string, number> = {
      row: yoga.FLEX_DIRECTION_ROW,
      column: yoga.FLEX_DIRECTION_COLUMN,
      "row-reverse": yoga.FLEX_DIRECTION_ROW_REVERSE,
      "column-reverse": yoga.FLEX_DIRECTION_COLUMN_REVERSE,
    };
    const direction = directionMap[lp.flexDirection];
    if (direction !== undefined) {
      yogaNode.setFlexDirection(direction);
    }
  }

  if (lp.alignItems !== undefined) {
    const alignMap: Record<string, number> = {
      "flex-start": yoga.ALIGN_FLEX_START,
      center: yoga.ALIGN_CENTER,
      "flex-end": yoga.ALIGN_FLEX_END,
      stretch: yoga.ALIGN_STRETCH,
    };
    const align = alignMap[lp.alignItems];
    if (align !== undefined) {
      yogaNode.setAlignItems(align);
    }
  }

  if (lp.justifyContent !== undefined) {
    const justifyMap: Record<string, number> = {
      "flex-start": yoga.JUSTIFY_FLEX_START,
      center: yoga.JUSTIFY_CENTER,
      "flex-end": yoga.JUSTIFY_FLEX_END,
      "space-between": yoga.JUSTIFY_SPACE_BETWEEN,
      "space-around": yoga.JUSTIFY_SPACE_AROUND,
      "space-evenly": yoga.JUSTIFY_SPACE_EVENLY,
    };
    const justify = justifyMap[lp.justifyContent];
    if (justify !== undefined) {
      yogaNode.setJustifyContent(justify);
    }
  }

  if (lp.padding !== undefined) {
    yogaNode.setPadding(yoga.EDGE_ALL, lp.padding);
  }
  if (lp.paddingTop !== undefined) {
    yogaNode.setPadding(yoga.EDGE_TOP, lp.paddingTop);
  }
  if (lp.paddingBottom !== undefined) {
    yogaNode.setPadding(yoga.EDGE_BOTTOM, lp.paddingBottom);
  }
  if (lp.paddingLeft !== undefined) {
    yogaNode.setPadding(yoga.EDGE_LEFT, lp.paddingLeft);
  }
  if (lp.paddingRight !== undefined) {
    yogaNode.setPadding(yoga.EDGE_RIGHT, lp.paddingRight);
  }

  if (lp.margin !== undefined) {
    yogaNode.setMargin(yoga.EDGE_ALL, lp.margin);
  }

  if (lp.border) {
    yogaNode.setBorder(yoga.EDGE_ALL, 1);
  }

  if (lp.position === "absolute") {
    yogaNode.setPositionType(yoga.POSITION_TYPE_ABSOLUTE);
    if (lp.top !== undefined) {
      yogaNode.setPosition(yoga.EDGE_TOP, lp.top);
    }
    if (lp.left !== undefined) {
      yogaNode.setPosition(yoga.EDGE_LEFT, lp.left);
    }
    if (lp.right !== undefined) {
      yogaNode.setPosition(yoga.EDGE_RIGHT, lp.right);
    }
    if (lp.bottom !== undefined) {
      yogaNode.setPosition(yoga.EDGE_BOTTOM, lp.bottom);
    }
  }
}

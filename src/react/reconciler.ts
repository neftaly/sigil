import ReactReconciler from "react-reconciler";
import { DefaultEventPriority } from "react-reconciler/constants.js";

import {
  type CellStyle,
  type Database,
  type LayoutNode,
  type NodeProps,
  type NodeType,
  type StyledRun,
  type TextNodeProps,
  type WrapMode,
  addNode,
  applyYogaStyles,
  measureText,
  removeNode,
  updateNode,
} from "../core/index.ts";

export interface ReconcilerOptions {
  onCommit?: () => void;
}

/**
 * Tracks child nodes that have been inlined as styled runs into a text parent.
 * Maps child node id -> parent node id.
 */
type InlinedTextMap = Map<string, string>;

/**
 * Tracks the ordering of inlined children within a text parent.
 * Maps parent node id -> ordered list of child node ids.
 */
type InlinedChildrenMap = Map<string, string[]>;

/** Build a CellStyle from TextNodeProps style properties. */
function buildRunStyle(props: TextNodeProps): CellStyle {
  return {
    ...(props.color && { fg: props.color }),
    ...(props.backgroundColor && { bg: props.backgroundColor }),
    ...(props.bold && { bold: true }),
    ...(props.italic && { italic: true }),
    ...(props.underline && { underline: true }),
  };
}

/**
 * Collect the styled runs from a text node.
 * If the node has its own runs (from inlined children), return those
 * with the parent style merged in. Otherwise return a single run
 * from its content prop.
 */
function collectRunsFromChild(
  childNode: LayoutNode,
  inheritedStyle: CellStyle,
): StyledRun[] {
  const childProps = childNode.props as TextNodeProps;
  const childOwnStyle = buildRunStyle(childProps);
  const mergedStyle: CellStyle = { ...inheritedStyle, ...childOwnStyle };

  if (childProps.runs && childProps.runs.length > 0) {
    // Child already has runs (it was itself a text parent with inlined children).
    // Merge the inherited style underneath each run's style.
    return childProps.runs.map((run) => ({
      text: run.text,
      style: { ...mergedStyle, ...run.style },
    }));
  }

  // Simple case: child has a content string
  return [{ text: childProps.content ?? "", style: mergedStyle }];
}

/** Rebuild the runs array and measurement for a text parent from its inlined children. */
function rebuildTextRuns(
  database: Database,
  parent: LayoutNode,
  inlinedChildren: InlinedChildrenMap,
) {
  const parentProps = parent.props as TextNodeProps;
  const childIds = inlinedChildren.get(parent.id) ?? [];

  if (childIds.length === 0) {
    // No inlined children — clear runs, measure from content only
    const newProps: TextNodeProps = { ...parentProps };
    delete newProps.runs;
    parent.props = newProps;
    setTextMeasureFunc(parent, newProps);
    return;
  }

  // Build the runs array: start with the parent's own content (if any),
  // then append each inlined child's content with its style.
  const runs: StyledRun[] = [];
  const parentStyle = buildRunStyle(parentProps);
  if (parentProps.content) {
    runs.push({ text: parentProps.content, style: parentStyle });
  }

  for (const childId of childIds) {
    const childNode = database.nodes.get(childId);
    if (childNode) {
      const childRuns = collectRunsFromChild(childNode, parentStyle);
      runs.push(...childRuns);
    }
  }

  const newProps: TextNodeProps = { ...parentProps, runs };
  parent.props = newProps;

  // Measure the total concatenated text of all runs
  const totalText = runs.map((r) => r.text).join("");
  const wrapMode: WrapMode = parentProps.wrap ? "wrap" : "nowrap";

  parent.yogaNode.setMeasureFunc((maxWidth, widthMode) => {
    const width = widthMode === 0 ? Infinity : maxWidth;
    const measured = measureText(totalText, wrapMode, width);
    return { width: measured.width, height: measured.height };
  });

  if (parent.yogaNode.getChildCount() === 0) {
    parent.yogaNode.markDirty();
  }
}

function detachChild(database: Database, child: LayoutNode) {
  if (child.parentId === null) {
    return;
  }
  const oldParent = database.nodes.get(child.parentId);
  if (oldParent) {
    const index = oldParent.childIds.indexOf(child.id);
    if (index !== -1) {
      oldParent.childIds.splice(index, 1);
      oldParent.yogaNode.removeChild(child.yogaNode);
    }
  }
}

function appendChildToParent(
  database: Database,
  parent: LayoutNode,
  child: LayoutNode,
) {
  detachChild(database, child);

  child.parentId = parent.id;
  parent.childIds.push(child.id);
  parent.yogaNode.insertChild(child.yogaNode, parent.childIds.length - 1);
}

function removeChildFromParent(
  database: Database,
  parent: LayoutNode,
  child: LayoutNode,
) {
  const index = parent.childIds.indexOf(child.id);
  if (index !== -1) {
    parent.childIds.splice(index, 1);
    parent.yogaNode.removeChild(child.yogaNode);
  }
  removeNode(database, child.id);
}

function insertChildBefore(
  database: Database,
  parent: LayoutNode,
  child: LayoutNode,
  beforeChild: LayoutNode,
) {
  detachChild(database, child);

  const beforeIndex = parent.childIds.indexOf(beforeChild.id);
  if (beforeIndex === -1) {
    parent.childIds.push(child.id);
  } else {
    parent.childIds.splice(beforeIndex, 0, child.id);
  }

  child.parentId = parent.id;
  const yogaIndex = parent.childIds.indexOf(child.id);
  parent.yogaNode.insertChild(child.yogaNode, yogaIndex);
}

function setTextMeasureFunc(node: LayoutNode, props: TextNodeProps) {
  const content = props.content ?? "";
  const wrapMode: WrapMode = props.wrap ? "wrap" : "nowrap";

  node.yogaNode.setMeasureFunc((maxWidth, widthMode) => {
    // MeasureMode.Undefined = 0
    const width = widthMode === 0 ? Infinity : maxWidth;
    const measured = measureText(content, wrapMode, width);
    return { width: measured.width, height: measured.height };
  });

  // Mark the node dirty so Yoga knows to re-measure
  if (node.yogaNode.getChildCount() === 0) {
    node.yogaNode.markDirty();
  }
}

/** Detach an inlined text child from its text parent. */
function detachInlinedChild(
  database: Database,
  child: LayoutNode,
  inlinedTextMap: InlinedTextMap,
  inlinedChildren: InlinedChildrenMap,
) {
  const parentId = inlinedTextMap.get(child.id);
  if (!parentId) return;

  inlinedTextMap.delete(child.id);

  const siblings = inlinedChildren.get(parentId);
  if (siblings) {
    const idx = siblings.indexOf(child.id);
    if (idx !== -1) siblings.splice(idx, 1);
    if (siblings.length === 0) inlinedChildren.delete(parentId);
  }

  const parent = database.nodes.get(parentId);
  if (parent) {
    rebuildTextRuns(database, parent, inlinedChildren);
  }
}

/** Add an inlined text child to a text parent (at end). */
function appendInlinedChild(
  database: Database,
  parent: LayoutNode,
  child: LayoutNode,
  inlinedTextMap: InlinedTextMap,
  inlinedChildren: InlinedChildrenMap,
) {
  // Detach from previous inline parent if any
  detachInlinedChild(database, child, inlinedTextMap, inlinedChildren);

  inlinedTextMap.set(child.id, parent.id);

  let siblings = inlinedChildren.get(parent.id);
  if (!siblings) {
    siblings = [];
    inlinedChildren.set(parent.id, siblings);
  }
  siblings.push(child.id);

  // Set parentId for cleanup tracking (but don't add to yoga tree)
  child.parentId = parent.id;

  rebuildTextRuns(database, parent, inlinedChildren);
}

/** Insert an inlined text child before another inlined child. */
function insertInlinedChildBefore(
  database: Database,
  parent: LayoutNode,
  child: LayoutNode,
  beforeChild: LayoutNode,
  inlinedTextMap: InlinedTextMap,
  inlinedChildren: InlinedChildrenMap,
) {
  detachInlinedChild(database, child, inlinedTextMap, inlinedChildren);

  inlinedTextMap.set(child.id, parent.id);

  let siblings = inlinedChildren.get(parent.id);
  if (!siblings) {
    siblings = [];
    inlinedChildren.set(parent.id, siblings);
  }

  const beforeIdx = siblings.indexOf(beforeChild.id);
  if (beforeIdx === -1) {
    siblings.push(child.id);
  } else {
    siblings.splice(beforeIdx, 0, child.id);
  }

  child.parentId = parent.id;

  rebuildTextRuns(database, parent, inlinedChildren);
}

/** Remove an inlined text child and clean up its database node. */
function removeInlinedChild(
  database: Database,
  child: LayoutNode,
  inlinedTextMap: InlinedTextMap,
  inlinedChildren: InlinedChildrenMap,
) {
  detachInlinedChild(database, child, inlinedTextMap, inlinedChildren);

  // Clean up the child's yoga node and database entry
  child.yogaNode.unsetMeasureFunc();
  child.yogaNode.free();
  database.nodes.delete(child.id);
}

export function createReconciler(
  database: Database,
  options?: ReconcilerOptions,
) {
  let nextNodeId = 0;
  function generateNodeId(): string {
    return `node_${++nextNodeId}`;
  }

  // Track text nodes inlined as styled runs into text parents
  const inlinedTextMap: InlinedTextMap = new Map();
  const inlinedChildren: InlinedChildrenMap = new Map();

  /** Check if a child should be inlined as a styled run into a text parent. */
  function isTextInText(parent: LayoutNode, child: LayoutNode): boolean {
    return parent.type === "text" && child.type === "text";
  }

  /**
   * Recursively clean up all inlined text children for a node and
   * all of its real (non-inlined) descendants. This must be called
   * before a node is removed from the tree.
   */
  function cleanupInlinedDescendants(node: LayoutNode) {
    // First, recurse into real children
    for (const childId of node.childIds) {
      const childNode = database.nodes.get(childId);
      if (childNode) {
        cleanupInlinedDescendants(childNode);
      }
    }

    // Then clean up this node's own inlined children
    const inlined = inlinedChildren.get(node.id);
    if (!inlined) return;

    for (const childId of [...inlined]) {
      const childNode = database.nodes.get(childId);
      if (childNode) {
        // Recursively clean up nested inlined children
        cleanupInlinedDescendants(childNode);
        inlinedTextMap.delete(childId);
        childNode.yogaNode.unsetMeasureFunc();
        childNode.yogaNode.free();
        database.nodes.delete(childId);
      }
    }
    inlinedChildren.delete(node.id);
  }

  const reconciler = ReactReconciler({
    supportsMutation: true,
    supportsPersistence: false,
    supportsHydration: false,
    supportsMicrotasks: true,

    createInstance(type: string, props: Record<string, unknown>) {
      const id = generateNodeId();
      const typedProps = props as NodeProps;
      const node = addNode(database, {
        id,
        type: type as NodeType,
        props: typedProps,
        parentId: null,
      });
      applyYogaStyles(node, typedProps);
      if (type === "text") {
        setTextMeasureFunc(node, typedProps as TextNodeProps);
      }
      return node;
    },

    createTextInstance(text: string) {
      const id = generateNodeId();
      const props: TextNodeProps = { content: text };
      const node = addNode(database, {
        id,
        type: "text",
        props,
        parentId: null,
      });
      setTextMeasureFunc(node, props);
      return node;
    },

    appendInitialChild(parent: LayoutNode, child: LayoutNode) {
      if (isTextInText(parent, child)) {
        appendInlinedChild(
          database,
          parent,
          child,
          inlinedTextMap,
          inlinedChildren,
        );
      } else {
        appendChildToParent(database, parent, child);
      }
    },

    appendChild(parent: LayoutNode, child: LayoutNode) {
      if (isTextInText(parent, child)) {
        appendInlinedChild(
          database,
          parent,
          child,
          inlinedTextMap,
          inlinedChildren,
        );
      } else {
        appendChildToParent(database, parent, child);
      }
    },

    appendChildToContainer(_container: Database, child: LayoutNode) {
      // The child becomes the root
      database.rootId = child.id;
    },

    removeChild(parent: LayoutNode, child: LayoutNode) {
      // First, clean up any inlined children this node may own
      cleanupInlinedDescendants(child);

      if (inlinedTextMap.has(child.id)) {
        removeInlinedChild(database, child, inlinedTextMap, inlinedChildren);
      } else {
        removeChildFromParent(database, parent, child);
      }
    },

    removeChildFromContainer(_container: Database, child: LayoutNode) {
      cleanupInlinedDescendants(child);
      removeNode(database, child.id);
    },

    insertBefore(
      parent: LayoutNode,
      child: LayoutNode,
      beforeChild: LayoutNode,
    ) {
      if (isTextInText(parent, child)) {
        insertInlinedChildBefore(
          database,
          parent,
          child,
          beforeChild,
          inlinedTextMap,
          inlinedChildren,
        );
      } else {
        insertChildBefore(database, parent, child, beforeChild);
      }
    },

    commitUpdate(
      instance: LayoutNode,
      _type: string,
      _oldProps: Record<string, unknown>,
      newProps: Record<string, unknown>,
    ) {
      const typedProps = newProps as NodeProps;
      updateNode(database, instance.id, typedProps);
      applyYogaStyles(instance, typedProps);

      if (instance.type === "text") {
        // If this node is inlined into a parent, rebuild the parent's runs
        const parentId = inlinedTextMap.get(instance.id);
        if (parentId) {
          const parent = database.nodes.get(parentId);
          if (parent) {
            rebuildTextRuns(database, parent, inlinedChildren);
          }
        } else {
          // Check if this is a text parent with inlined children
          if (inlinedChildren.has(instance.id)) {
            rebuildTextRuns(database, instance, inlinedChildren);
          } else {
            setTextMeasureFunc(instance, typedProps as TextNodeProps);
          }
        }
      }
    },

    commitTextUpdate(instance: LayoutNode, _oldText: string, newText: string) {
      const props: TextNodeProps = { content: newText };
      updateNode(database, instance.id, props);

      // If this text instance is inlined into a parent, rebuild parent runs
      const parentId = inlinedTextMap.get(instance.id);
      if (parentId) {
        const parent = database.nodes.get(parentId);
        if (parent) {
          rebuildTextRuns(database, parent, inlinedChildren);
        }
      } else {
        setTextMeasureFunc(instance, props);
      }
    },

    resetTextContent() {
      // No-op
    },

    finalizeInitialChildren() {
      return false;
    },

    prepareForCommit() {
      return null;
    },

    resetAfterCommit() {
      options?.onCommit?.();
    },

    shouldSetTextContent() {
      return false;
    },

    getRootHostContext() {
      return {};
    },

    getChildHostContext(parentContext: Record<string, never>) {
      return parentContext;
    },

    getPublicInstance(instance: LayoutNode) {
      return instance;
    },

    scheduleTimeout: setTimeout,
    cancelTimeout: clearTimeout,
    noTimeout: -1,

    isPrimaryRenderer: true,

    scheduleMicrotask: queueMicrotask,

    setCurrentUpdatePriority() {
      // No-op
    },

    getCurrentUpdatePriority() {
      return DefaultEventPriority;
    },

    resolveUpdatePriority() {
      return DefaultEventPriority;
    },

    shouldAttemptEagerTransition() {
      return false;
    },

    trackSchedulerEvent() {
      // No-op
    },

    resolveEventType() {
      return null;
    },

    resolveEventTimeStamp() {
      return -1.1;
    },

    requestPostPaintCallback() {
      // No-op
    },

    maySuspendCommit() {
      return false;
    },

    preloadInstance() {
      return true;
    },

    startSuspendingCommit() {
      // No-op
    },

    suspendInstance() {
      // No-op
    },

    waitForCommitToBeReady() {
      return null;
    },

    NotPendingTransition: null,
    HostTransitionContext: {
      $$typeof: Symbol.for("react.context"),
      _currentValue: null,
    } as never,

    preparePortalMount() {
      // No-op
    },

    resetFormInstance() {
      // No-op
    },

    hideInstance(instance: LayoutNode) {
      instance.yogaNode.setDisplay(database.yoga.DISPLAY_NONE);
    },

    unhideInstance(instance: LayoutNode) {
      instance.yogaNode.setDisplay(database.yoga.DISPLAY_FLEX);
    },

    hideTextInstance(instance: LayoutNode) {
      instance.yogaNode.setDisplay(database.yoga.DISPLAY_NONE);
    },

    unhideTextInstance(instance: LayoutNode) {
      instance.yogaNode.setDisplay(database.yoga.DISPLAY_FLEX);
    },

    clearContainer() {
      // No-op
    },

    detachDeletedInstance() {
      // No-op
    },

    getInstanceFromNode() {
      return null;
    },

    beforeActiveInstanceBlur() {
      // No-op
    },

    afterActiveInstanceBlur() {
      // No-op
    },

    getInstanceFromScope() {
      return null;
    },

    prepareScopeUpdate() {
      // No-op
    },
  });

  return reconciler;
}

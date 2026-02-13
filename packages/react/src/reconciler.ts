import ReactReconciler from "react-reconciler";
import { DefaultEventPriority } from "react-reconciler/constants.js";

import {
  type Database,
  type LayoutNode,
  type NodeProps,
  type NodeType,
  type TextNodeProps,
  type WrapMode,
  addNode,
  applyYogaStyles,
  measureText,
  removeNode,
  updateNode,
} from "@charui/core";

export interface ReconcilerOptions {
  onCommit?: () => void;
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

export function createReconciler(
  database: Database,
  options?: ReconcilerOptions,
) {
  let nextNodeId = 0;
  function generateNodeId(): string {
    return `node_${++nextNodeId}`;
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
      appendChildToParent(database, parent, child);
    },

    appendChild(parent: LayoutNode, child: LayoutNode) {
      appendChildToParent(database, parent, child);
    },

    appendChildToContainer(_container: Database, child: LayoutNode) {
      // The child becomes the root
      database.rootId = child.id;
    },

    removeChild(parent: LayoutNode, child: LayoutNode) {
      removeChildFromParent(database, parent, child);
    },

    removeChildFromContainer(_container: Database, child: LayoutNode) {
      removeNode(database, child.id);
    },

    insertBefore(
      parent: LayoutNode,
      child: LayoutNode,
      beforeChild: LayoutNode,
    ) {
      insertChildBefore(database, parent, child, beforeChild);
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
        setTextMeasureFunc(instance, typedProps as TextNodeProps);
      }
    },

    commitTextUpdate(instance: LayoutNode, _oldText: string, newText: string) {
      const props: TextNodeProps = { content: newText };
      updateNode(database, instance.id, props);
      setTextMeasureFunc(instance, props);
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

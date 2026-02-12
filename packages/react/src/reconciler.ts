import ReactReconciler from "react-reconciler";
import { DefaultEventPriority } from "react-reconciler/constants.js";

import {
  type Database,
  type LayoutNode,
  type NodeProps,
  type TextNodeProps,
  addNode,
  applyYogaStyles,
  measureText,
  removeNode,
  updateNode,
} from "@charui/core";

let nodeCounter = 0;

function generateId(): string {
  return `node_${++nodeCounter}`;
}

export type Instance = LayoutNode;
export type TextInstance = LayoutNode;

export function createReconciler(database: Database) {
  const reconciler = ReactReconciler({
    supportsMutation: true,
    supportsPersistence: false,
    supportsHydration: false,
    supportsMicrotasks: true,

    createInstance(type: string, props: Record<string, unknown>) {
      const id = generateId();
      const typedProps = props as NodeProps;
      const node = addNode(database, {
        id,
        type,
        props: typedProps,
        parentId: null,
      });
      applyYogaStyles(database, node, typedProps);
      if (type === "text") {
        setTextMeasureFunc(node, typedProps as TextNodeProps);
      }
      return node;
    },

    createTextInstance(text: string) {
      const id = generateId();
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

    appendInitialChild(parent: Instance, child: Instance | TextInstance) {
      appendChildToParent(database, parent, child);
    },

    appendChild(parent: Instance, child: Instance | TextInstance) {
      appendChildToParent(database, parent, child);
    },

    appendChildToContainer(_container: Database, child: Instance) {
      // The child becomes the root
      database.rootId = child.id;
    },

    removeChild(parent: Instance, child: Instance | TextInstance) {
      removeChildFromParent(database, parent, child);
    },

    removeChildFromContainer(_container: Database, child: Instance) {
      removeNode(database, child.id);
    },

    insertBefore(
      parent: Instance,
      child: Instance | TextInstance,
      beforeChild: Instance | TextInstance,
    ) {
      insertChildBefore(database, parent, child, beforeChild);
    },

    commitUpdate(
      instance: Instance,
      _type: string,
      _oldProps: Record<string, unknown>,
      newProps: Record<string, unknown>,
    ) {
      const typedProps = newProps as NodeProps;
      updateNode(database, instance.id, typedProps);
      applyYogaStyles(database, instance, typedProps);
      if (instance.type === "text") {
        setTextMeasureFunc(instance, typedProps as TextNodeProps);
      }
    },

    commitTextUpdate(
      instance: TextInstance,
      _oldText: string,
      newText: string,
    ) {
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
      // Layout will be triggered by the caller
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

    getPublicInstance(instance: Instance) {
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

    hideInstance(instance: Instance) {
      instance.yogaNode.setDisplay(database.yoga.DISPLAY_NONE);
    },

    unhideInstance(instance: Instance) {
      instance.yogaNode.setDisplay(database.yoga.DISPLAY_FLEX);
    },

    hideTextInstance(instance: TextInstance) {
      instance.yogaNode.setDisplay(database.yoga.DISPLAY_NONE);
    },

    unhideTextInstance(instance: TextInstance) {
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

function appendChildToParent(
  database: Database,
  parent: Instance,
  child: Instance | TextInstance,
) {
  // Detach from previous parent if any
  if (child.parentId !== null) {
    const oldParent = database.nodes.get(child.parentId);
    if (oldParent) {
      const index = oldParent.childIds.indexOf(child.id);
      if (index !== -1) {
        oldParent.childIds.splice(index, 1);
        oldParent.yogaNode.removeChild(child.yogaNode);
      }
    }
  }

  child.parentId = parent.id;
  parent.childIds.push(child.id);
  parent.yogaNode.insertChild(child.yogaNode, parent.childIds.length - 1);
}

function removeChildFromParent(
  database: Database,
  parent: Instance,
  child: Instance | TextInstance,
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
  parent: Instance,
  child: Instance | TextInstance,
  beforeChild: Instance | TextInstance,
) {
  // Detach from previous parent if any
  if (child.parentId !== null) {
    const oldParent = database.nodes.get(child.parentId);
    if (oldParent) {
      const idx = oldParent.childIds.indexOf(child.id);
      if (idx !== -1) {
        oldParent.childIds.splice(idx, 1);
        oldParent.yogaNode.removeChild(child.yogaNode);
      }
    }
  }

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
  const wrapMode = props.wrap ? "wrap" : "nowrap";

  node.yogaNode.setMeasureFunc((maxWidth, widthMode) => {
    // MeasureMode.Undefined = 0
    const width = widthMode === 0 ? Infinity : maxWidth;
    const measured = measureText(content, wrapMode as "wrap" | "nowrap", width);
    return { width: measured.width, height: measured.height };
  });

  // Mark the node dirty so Yoga knows to re-measure
  if (node.yogaNode.getChildCount() === 0) {
    node.yogaNode.markDirty();
  }
}

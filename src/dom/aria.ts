import type { Database } from "../core/database.ts";
import type { BoxNodeProps } from "../core/types.ts";

export interface AriaManager {
  /** Update ARIA elements to match current tree state. Call after each layout. */
  sync(database: Database, cellWidth: number, cellHeight: number): void;
  /** Clean up all ARIA elements. */
  dispose(): void;
}

/** ARIA attribute keys that we sync from node props to DOM elements. */
const ARIA_ATTRS = [
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-checked",
  "aria-selected",
  "aria-expanded",
  "aria-disabled",
  "aria-valuemin",
  "aria-valuemax",
  "aria-valuenow",
  "aria-valuetext",
] as const;

/**
 * Create a native HTML element corresponding to the given ARIA role.
 */
function createElementForRole(
  role: string,
  doc: Document,
): HTMLElement {
  switch (role) {
    case "textbox":
      return Object.assign(doc.createElement("input"), { type: "text" });
    case "spinbutton":
      return Object.assign(doc.createElement("input"), { type: "number" });
    case "textarea":
      return doc.createElement("textarea");
    case "checkbox":
      return Object.assign(doc.createElement("input"), { type: "checkbox" });
    case "radiogroup":
      return doc.createElement("fieldset");
    case "listbox":
      return doc.createElement("select");
    case "button":
      return doc.createElement("button");
    case "dialog":
      return doc.createElement("dialog");
    case "slider":
      return Object.assign(doc.createElement("input"), { type: "range" });
    case "progressbar": {
      const el = doc.createElement("div");
      el.setAttribute("role", "progressbar");
      return el;
    }
    case "status": {
      const el = doc.createElement("div");
      el.setAttribute("role", "status");
      return el;
    }
    default: {
      const el = doc.createElement("div");
      el.setAttribute("role", role);
      return el;
    }
  }
}

/**
 * Returns true if the element is a form control that supports the `disabled` property.
 */
function isDisableable(
  el: HTMLElement,
): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement | HTMLFieldSetElement {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLButtonElement ||
    el instanceof HTMLFieldSetElement
  );
}

/**
 * Sync ARIA attributes from node props onto the DOM element.
 */
function syncAriaAttrs(el: HTMLElement, props: BoxNodeProps): void {
  for (const attr of ARIA_ATTRS) {
    const value = props[attr];
    if (value !== undefined && value !== null) {
      el.setAttribute(attr, String(value));
    } else {
      el.removeAttribute(attr);
    }
  }

  // Handle `disabled` prop
  if (props.disabled) {
    el.setAttribute("aria-disabled", "true");
    if (isDisableable(el)) {
      el.disabled = true;
    }
  } else {
    // Only remove aria-disabled if not explicitly set via props
    if (props["aria-disabled"] === undefined) {
      el.removeAttribute("aria-disabled");
    }
    if (isDisableable(el)) {
      el.disabled = false;
    }
  }
}

export function createAriaManager(container: HTMLElement): AriaManager {
  const doc = container.ownerDocument;

  // Create the ARIA overlay container
  const ariaContainer = doc.createElement("div");
  ariaContainer.style.position = "absolute";
  ariaContainer.style.top = "0";
  ariaContainer.style.left = "0";
  ariaContainer.style.width = "100%";
  ariaContainer.style.height = "100%";
  ariaContainer.style.pointerEvents = "none";
  ariaContainer.setAttribute("aria-hidden", "false");
  container.appendChild(ariaContainer);

  // Map from node id to the DOM element we created for it
  const elements = new Map<string, HTMLElement>();
  // Track which role was used to create each element, so we can recreate if role changes
  const elementRoles = new Map<string, string>();

  function sync(
    database: Database,
    cellWidth: number,
    cellHeight: number,
  ): void {
    const activeIds = new Set<string>();

    for (const [nodeId, node] of database.nodes) {
      const props = node.props as BoxNodeProps;
      const role = props.role;
      if (!role || !node.bounds) {
        continue;
      }

      activeIds.add(nodeId);

      let el = elements.get(nodeId);
      const prevRole = elementRoles.get(nodeId);

      // If the role changed, remove the old element and create a new one
      if (el && prevRole !== role) {
        ariaContainer.removeChild(el);
        elements.delete(nodeId);
        elementRoles.delete(nodeId);
        el = undefined;
      }

      if (!el) {
        el = createElementForRole(role, doc);
        // Make visually hidden but accessible
        el.style.position = "absolute";
        el.style.opacity = "0";
        el.style.overflow = "hidden";
        el.style.pointerEvents = "none";
        ariaContainer.appendChild(el);
        elements.set(nodeId, el);
        elementRoles.set(nodeId, role);
      }

      // Position over the grid bounds
      const { x, y, width, height } = node.bounds;
      el.style.left = `${x * cellWidth}px`;
      el.style.top = `${y * cellHeight}px`;
      el.style.width = `${width * cellWidth}px`;
      el.style.height = `${height * cellHeight}px`;

      // Sync ARIA attributes
      syncAriaAttrs(el, props);
    }

    // Remove DOM elements for nodes that no longer exist
    for (const [nodeId, el] of elements) {
      if (!activeIds.has(nodeId)) {
        ariaContainer.removeChild(el);
        elements.delete(nodeId);
        elementRoles.delete(nodeId);
      }
    }
  }

  function dispose(): void {
    for (const el of elements.values()) {
      ariaContainer.removeChild(el);
    }
    elements.clear();
    elementRoles.clear();
    container.removeChild(ariaContainer);
  }

  return { sync, dispose };
}

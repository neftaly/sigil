import { type ReactNode, createElement, useCallback } from "react";

import type { KeyEvent } from "../core/index.ts";

export interface FocusTrapProps {
  children: ReactNode;
  /** When false, the trap is deactivated and Tab passes through normally. Default: true. */
  active?: boolean;
}

/**
 * FocusTrap constrains Tab/Shift+Tab focus cycling to its descendants.
 * Used by Dialog and similar overlay components.
 *
 * TODO: Full focus trapping requires core support. Currently, Tab is handled
 * at the top of `dispatchKeyEvent` (before capture/bubble phases), so
 * `onKeyDown` handlers never receive Tab events. To implement proper focus
 * trapping, `dispatchKeyEvent` needs to be updated to:
 *   1. Run the capture phase for Tab events before calling `focusRelative`
 *   2. Allow capture handlers to prevent the default Tab behavior
 *   3. Expose a way to find all focusable descendants of a given node
 *
 * For now, this component renders a wrapper Box with an `onKeyDownCapture`
 * handler that returns `true` to stop propagation when active. This is a
 * placeholder that will work once the core event system supports it.
 */
export function FocusTrap({
  children,
  active = true,
}: FocusTrapProps): ReactNode {
  const handleKeyDownCapture = useCallback(
    (event: KeyEvent): boolean | void => {
      if (!active) {
        return;
      }

      // Intercept Tab/Shift+Tab to constrain focus within the trap.
      // TODO: Once the core event system allows capture-phase handlers to
      // intercept Tab before `focusRelative` runs, this handler should:
      //   1. Collect all focusable descendant nodes within this trap
      //   2. Determine the current focus position within that set
      //   3. Cycle to the next/previous focusable descendant (wrapping around)
      //   4. Return true to stop propagation and prevent the default Tab behavior
      if (event.key === "Tab") {
        return true;
      }
    },
    [active],
  );

  return createElement(
    "box",
    {
      focusable: false,
      onKeyDownCapture: handleKeyDownCapture,
    },
    children,
  );
}

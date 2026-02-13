import { createElement, useRef, useState } from "react";

import type { LayoutNode } from "@charui/core";
import { Box, Text, useCanvasContext } from "@charui/react";
import { useDrag, useResize } from "@charui/interactions";
import { CharuiCanvas } from "@charui/dom";

import { Input, type InputChangeEvent } from "./Input.tsx";

export default {
  title: "Components/InputField",
};

export const InputField = () => {
  const [state, setState] = useState<InputChangeEvent>({
    value: "",
    selectionStart: 0,
    selectionEnd: 0,
    scrollOffset: 0,
  });
  return (
    <CharuiCanvas width={30} height={3}>
      <Box border width={30} height={3}>
        <Input
          value={state.value}
          selectionStart={state.selectionStart}
          selectionEnd={state.selectionEnd}
          scrollOffset={state.scrollOffset}
          showCursor
          width={28}
          placeholder="Type here..."
          onChange={setState}
        />
      </Box>
    </CharuiCanvas>
  );
};

export const FocusDemo = () => {
  const [focused, setFocused] = useState(0);
  const [states, setStates] = useState<InputChangeEvent[]>([
    { value: "", selectionStart: 0, selectionEnd: 0, scrollOffset: 0 },
    { value: "", selectionStart: 0, selectionEnd: 0, scrollOffset: 0 },
  ]);

  const handleChange = (index: number) => (event: InputChangeEvent) => {
    setStates((prev) => {
      const next = [...prev];
      next[index] = event;
      return next;
    });
  };

  return (
    <CharuiCanvas width={30} height={7}>
      <Box width={30} height={7} flexDirection="column">
        <Box width={30} height={1}>
          <Text>Name:</Text>
        </Box>
        <Box border width={30} height={3}>
          <Input
            value={states[0].value}
            selectionStart={states[0].selectionStart}
            selectionEnd={states[0].selectionEnd}
            scrollOffset={states[0].scrollOffset}
            showCursor={focused === 0}
            width={28}
            placeholder="Name"
            onChange={handleChange(0)}
            onFocus={() => setFocused(0)}
          />
        </Box>
        <Box border width={30} height={3}>
          <Input
            value={states[1].value}
            selectionStart={states[1].selectionStart}
            selectionEnd={states[1].selectionEnd}
            scrollOffset={states[1].scrollOffset}
            showCursor={focused === 1}
            width={28}
            placeholder="Email"
            onChange={handleChange(1)}
            onFocus={() => setFocused(1)}
          />
        </Box>
      </Box>
    </CharuiCanvas>
  );
};

function ResizableBoxInner() {
  const { eventState } = useCanvasContext();
  const nodeRef = useRef<LayoutNode>(null);

  const { width, height, handlers } = useResize({
    eventState,
    nodeRef,
    initialWidth: 20,
    initialHeight: 5,
    minWidth: 5,
    minHeight: 3,
  });

  return createElement(
    "box",
    { width: 40, height: 15 },
    createElement(
      "box",
      {
        ref: nodeRef,
        border: true,
        width,
        height,
        cursor: "nwse-resize",
        ...handlers,
      },
      createElement("text", { content: "Drag to resize" }),
    ),
  );
}

export const ResizableBox = () => (
  <CharuiCanvas width={40} height={15}>
    <ResizableBoxInner />
  </CharuiCanvas>
);

function DraggableBoxInner() {
  const { eventState } = useCanvasContext();
  const nodeRef = useRef<LayoutNode>(null);
  const [pos, setPos] = useState({ left: 5, top: 3 });

  const { deltaCol, deltaRow, handlers } = useDrag({
    eventState,
    nodeRef,
    onDragEnd: (delta) => {
      setPos((prev) => ({
        left: prev.left + delta.col,
        top: prev.top + delta.row,
      }));
    },
  });

  return createElement(
    "box",
    { width: 40, height: 15 },
    createElement(
      "box",
      {
        ref: nodeRef,
        border: true,
        position: "absolute",
        left: pos.left + deltaCol,
        top: pos.top + deltaRow,
        width: 16,
        height: 3,
        cursor: "grab",
        ...handlers,
      },
      createElement("text", { content: "Drag me!" }),
    ),
  );
}

export const DraggableBox = () => (
  <CharuiCanvas width={40} height={15}>
    <DraggableBoxInner />
  </CharuiCanvas>
);

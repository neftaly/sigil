import React, { useState } from "react";

import { Box, Text } from "@charui/react";
import { CharuiCanvas } from "@charui/dom";

import { Input, type InputChangeEvent } from "./Input.tsx";

export default {
  title: "Components/InputField",
};

export const InputField = () => {
  const [state, setState] = useState<InputChangeEvent>({
    value: "",
    cursorPosition: 0,
    scrollOffset: 0,
  });
  return (
    <CharuiCanvas width={30} height={3}>
      <Box border width={30} height={3}>
        <Input
          value={state.value}
          cursorPosition={state.cursorPosition}
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
  const [values, setValues] = useState(["", ""]);
  const [cursors, setCursors] = useState([0, 0]);
  const [scrolls, setScrolls] = useState([0, 0]);
  const handleChange = (index: number) => (event: InputChangeEvent) => {
    setValues((prev) => {
      const next = [...prev];
      next[index] = event.value;
      return next;
    });
    setCursors((prev) => {
      const next = [...prev];
      next[index] = event.cursorPosition;
      return next;
    });
    setScrolls((prev) => {
      const next = [...prev];
      next[index] = event.scrollOffset;
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
            value={values[0]}
            cursorPosition={cursors[0]}
            scrollOffset={scrolls[0]}
            showCursor={focused === 0}
            width={28}
            placeholder="Name"
            onChange={handleChange(0)}
            onFocus={() => setFocused(0)}
          />
        </Box>
        <Box border width={30} height={3}>
          <Input
            value={values[1]}
            cursorPosition={cursors[1]}
            scrollOffset={scrolls[1]}
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

export const ResizableBox = () => {
  const [size, setSize] = useState({ width: 20, height: 5 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ col: 0, row: 0, width: 20, height: 5 });

  return (
    <CharuiCanvas width={40} height={15}>
      <Box width={40} height={15}>
        <Box
          border
          width={size.width}
          height={size.height}
          cursor="nwse-resize"
          onPointerDown={(event) => {
            setDragging(true);
            setStart({
              col: event.col,
              row: event.row,
              width: size.width,
              height: size.height,
            });
          }}
          onPointerMove={(event) => {
            if (!dragging) {
              return;
            }
            const deltaCol = event.col - start.col;
            const deltaRow = event.row - start.row;
            setSize({
              width: Math.max(5, start.width + deltaCol),
              height: Math.max(3, start.height + deltaRow),
            });
          }}
          onPointerUp={() => {
            setDragging(false);
          }}
        >
          <Text>Drag to resize</Text>
        </Box>
      </Box>
    </CharuiCanvas>
  );
};

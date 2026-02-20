import React from "react";

import { Box, Text } from "../react/index.ts";

import { CharuiCanvas } from "./CharuiCanvas.tsx";

export default {
  title: "CharuiCanvas",
  component: CharuiCanvas,
};

export const BorderedBoxWithText = () => (
  <CharuiCanvas width={30} height={5}>
    <Box border width={30} height={5}>
      <Text>Hello, charui!</Text>
    </Box>
  </CharuiCanvas>
);

export const NestedBoxes = () => (
  <CharuiCanvas width={40} height={9}>
    <Box border width={40} height={9}>
      <Box border width={20} height={5}>
        <Text>Inner box</Text>
      </Box>
      <Text>Outer text</Text>
    </Box>
  </CharuiCanvas>
);

export const FlexRow = () => (
  <CharuiCanvas width={40} height={5}>
    <Box flexDirection="row" width={40} height={5}>
      <Box border width={20} height={5}>
        <Text>Left</Text>
      </Box>
      <Box border width={20} height={5}>
        <Text>Right</Text>
      </Box>
    </Box>
  </CharuiCanvas>
);

export const TextWrapping = () => (
  <CharuiCanvas width={20} height={6}>
    <Box border width={20} height={6}>
      <Text wrap>The quick brown fox jumps over the lazy dog</Text>
    </Box>
  </CharuiCanvas>
);

export const OverlappingPanes = () => (
  <CharuiCanvas width={30} height={10}>
    <Box width={30} height={10}>
      <Box border width={20} height={6} backgroundColor="#333">
        <Text>Background</Text>
      </Box>
      <Box
        border
        position="absolute"
        top={3}
        left={10}
        width={18}
        height={5}
        backgroundColor="#224"
      >
        <Text color="#88ccff">Foreground</Text>
      </Box>
    </Box>
  </CharuiCanvas>
);

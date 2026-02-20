import React, { useEffect, useState } from "react";

import { Box, Text } from "../react/primitives.tsx";

const DEFAULT_FRAMES = [
  "\u280B", "\u2819", "\u2839", "\u2838",
  "\u283C", "\u2834", "\u2826", "\u2827",
  "\u2807", "\u280F",
];

export interface SpinnerProps {
  label?: string;
  frames?: string[];
  interval?: number; // ms, default 80
}

export function Spinner({
  label,
  frames = DEFAULT_FRAMES,
  interval = 80,
}: SpinnerProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % frames.length);
    }, interval);
    return () => clearInterval(timer);
  }, [frames.length, interval]);

  const frame = frames[index];

  return (
    <Box flexDirection="row" role="status">
      <Text>{frame}</Text>
      {label && <Text> {label}</Text>}
    </Box>
  );
}

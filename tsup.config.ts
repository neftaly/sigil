import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "dom/index": "src/dom/index.ts",
    "terminal/index": "src/terminal/index.ts",
    "threedee/index": "src/threedee/index.ts",
  },
  format: ["esm"],
  dts: true,
  splitting: true,
  clean: true,
  outDir: "dist",
  external: [
    "react",
    "react-reconciler",
    "react-reconciler/constants.js",
    "@react-three/fiber",
    "@react-three/drei",
    "three",
    "troika-three-text",
    "@xterm/xterm",
  ],
});

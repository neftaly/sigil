import type { StorybookConfig } from "@storybook/react-vite";
import topLevelAwait from "vite-plugin-top-level-await";
import wasm from "vite-plugin-wasm";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  framework: "@storybook/react-vite",
  viteFinal(config) {
    config.plugins = config.plugins ?? [];
    config.plugins.push(wasm());
    config.plugins.push(topLevelAwait());
    return config;
  },
};

export default config;

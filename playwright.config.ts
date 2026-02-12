import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:6006",
    headless: true,
  },
  webServer: {
    command: "pnpm storybook --ci -p 6006",
    port: 6006,
    reuseExistingServer: true,
    timeout: 30000,
  },
});

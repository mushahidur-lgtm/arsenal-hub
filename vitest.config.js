import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.{js,jsx}"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    globalSetup: ["tests/unit/global-setup.js"],
    setupFiles: ["tests/unit/setup.js"],
  },
});

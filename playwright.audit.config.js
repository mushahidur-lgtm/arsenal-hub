import { defineConfig } from "@playwright/test";

/**
 * Visual/functional audit against a running dev server:
 *   AUDIT_BASE=http://localhost:5173/arsenal-hub/ AUDIT_OUT=audit/after npx playwright test -c playwright.audit.config.js
 */
export default defineConfig({
  testDir: "tests/audit",
  testMatch: /.*\.audit\.js/,
  timeout: 180_000,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: process.env.AUDIT_BASE ?? "http://localhost:5173/arsenal-hub/", locale: "en-GB", timezoneId: "UTC" },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});

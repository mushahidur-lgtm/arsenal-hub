import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const BASE = `http://localhost:${PORT}/arsenal-hub/`;

/**
 * End-to-end tests run against the *production build* served at the GitHub Pages sub-path
 * (/arsenal-hub/), exactly as deployed. All third-party hosts are replayed from recorded real
 * responses (tests/e2e/support.js), so the suite is offline, deterministic and never calls live APIs.
 */
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: /.*\.spec\.js/,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: { baseURL: BASE, trace: "retain-on-failure", screenshot: "only-on-failure", locale: "en-GB", timezoneId: "UTC" },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});

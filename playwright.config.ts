import { defineConfig, devices } from "@playwright/test";

/**
 * The gates run against the **production build**, not the dev server: dev-only
 * chrome (the fixture switcher) is absent there, and the CSP is only injected
 * into built HTML. Testing the artifact that ships is the point.
 *
 * Two servers, because pseudo-localization is a separate build:
 *   4173 — the normal build, for the render / a11y / RTL gates
 *   4174 — VITE_PSEUDO=1, for the truncation and untranslated-string gate
 *
 * Fixtures are addressed with `?state=<doc>-<agent>`, which `src/main.tsx` reads
 * into the memory-history initial entry.
 */
export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? [["github"], ["list"]] : [["list"]],
  use: {
    trace: "on-first-retry",
    // Colour transitions are 120ms (`vellum-motion`). Sampling a computed style
    // mid-transition returns the interpolated value, which made the dark-theme
    // axe run read a half-faded background and report a contrast failure that
    // does not exist. The stylesheet zeroes durations under reduced motion, so
    // this makes assertions deterministic — and exercises that path.
    reducedMotion: "reduce",
  },
  projects: [
    {
      name: "chromium",
      testDir: "./tests",
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4173" },
    },
    {
      name: "pseudo",
      testDir: "./tests-pseudo",
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4174" },
    },
  ],
  webServer: [
    {
      command: "npm run build && npx vite preview --port 4173 --strictPort",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: !process.env["CI"],
      timeout: 120_000,
    },
    {
      command:
        "npm run build:pseudo && npx vite preview --outDir dist-pseudo --port 4174 --strictPort",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: !process.env["CI"],
      timeout: 120_000,
    },
  ],
});

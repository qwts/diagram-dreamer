import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

/**
 * The gate suite, shared by every host.
 *
 * The specs live in `packages/shell` because that is whose behaviour they
 * describe — they import fixtures and testids from `@vellum/shell/testing` and
 * never name a host. Running the same files against every host is the only
 * thing that makes "host-neutral" a claim rather than an assertion; a copy per
 * host would let one drift green while the shell broke under the other.
 *
 * The gates run against the **production build**, not the dev server: dev-only
 * chrome (the fixture switcher) is absent there, and the CSP is only injected
 * into built HTML. Testing the artifact that ships is the point.
 *
 * Two servers per host, because pseudo-localization is a separate build:
 *   `port` — the normal build, for the render / a11y / RTL gates
 *   `pseudoPort` — VITE_PSEUDO=1, for the truncation and untranslated-string gate
 *
 * Fixtures are addressed with `?state=<doc>-<agent>`, which each host's
 * `src/main.tsx` reads into the history it constructs. A query string rather
 * than a path deliberately: it is the one addressing scheme that means the same
 * thing under memory, browser, and hash history, so the specs stay host-neutral.
 */

const SHELL = new URL("../packages/shell/", import.meta.url);

export interface HostGateOptions {
  /** Port for the normal production build. Distinct per host so hosts can run at once. */
  port: number;
  /** Port for the pseudo-localization build. */
  pseudoPort: number;
  /**
   * This host's own spec directory, usually `new URL("tests/", import.meta.url)`.
   *
   * The shared gates above cannot say anything about capabilities, because the
   * hosts deliberately differ: `apps/web` can export and cannot save, and a
   * spec asserting either would be false next door. So the claim "the toolbar
   * offers exactly what this host can do" is proved per host, against that
   * host's build, in a directory the host owns.
   *
   * Required rather than optional: a host is defined by the capabilities it
   * supplies, and one that supplies them without proving what the shell then
   * offers is the gap #27 exists to close.
   */
  capabilityTests: URL;
}

export const hostGateConfig = ({ port, pseudoPort, capabilityTests }: HostGateOptions) =>
  defineConfig({
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
        testDir: fileURLToPath(new URL("tests", SHELL)),
        use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${port}` },
      },
      {
        name: "pseudo",
        testDir: fileURLToPath(new URL("tests-pseudo", SHELL)),
        use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${pseudoPort}` },
      },
      {
        name: "capabilities",
        testDir: fileURLToPath(capabilityTests),
        use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${port}` },
      },
    ],
    // `--host 127.0.0.1` is load-bearing, not decoration. Vite preview otherwise
    // binds to the name `localhost`, which Node 22 resolves to ::1 first on the
    // CI runners; the server then listens on IPv6 only and every poll of
    // 127.0.0.1 is refused until the timeout. Binding and polling the same
    // literal address keeps the two in step.
    webServer: [
      {
        command: `npm run build && npx vite preview --host 127.0.0.1 --port ${port} --strictPort`,
        url: `http://127.0.0.1:${port}`,
        reuseExistingServer: !process.env["CI"],
        stdout: process.env["CI"] ? "pipe" : "ignore",
        timeout: 120_000,
      },
      {
        command: `npm run build:pseudo && npx vite preview --host 127.0.0.1 --outDir dist-pseudo --port ${pseudoPort} --strictPort`,
        url: `http://127.0.0.1:${pseudoPort}`,
        reuseExistingServer: !process.env["CI"],
        stdout: process.env["CI"] ? "pipe" : "ignore",
        timeout: 120_000,
      },
    ],
  });

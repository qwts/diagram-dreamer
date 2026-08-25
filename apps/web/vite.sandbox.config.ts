import { sandboxConfig } from "../vite-sandbox.shared.ts";

/**
 * Identical to `apps/desktop`'s, and that is the point: the sandbox document
 * and its hash-pinning build live in `@vellum/core`, so a host runs the build
 * to place the artifact in its own `dist` and decides nothing about it.
 */
export default sandboxConfig();

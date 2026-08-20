/**
 * Entry point for `sandbox.html`, and the only module in this app allowed to
 * pull in Mermaid.
 *
 * It is three lines because everything it does belongs to `@vellum/core` — the
 * app's job here is to *bundle* the sandbox, not to implement it (CLAUDE.md
 * invariant 1). Kept as a separate Vite input so Mermaid lands in its own
 * output and never reaches the main bundle.
 */

import { startSandbox } from "@vellum/core/sandbox";

startSandbox();

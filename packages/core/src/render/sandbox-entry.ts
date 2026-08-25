/**
 * Entry point for `sandbox.html`, and the only module in the tree that pulls in
 * Mermaid.
 *
 * Two lines, and it lives beside the document it boots rather than in a host,
 * because nothing about it is host-specific: every host ships the same sandbox
 * and differs only in where the built file lands. Kept as a separate build
 * input so Mermaid gets its own output and never reaches an app bundle.
 */

import { startSandbox } from "./sandbox";

startSandbox();

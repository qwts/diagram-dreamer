import { sandboxConfig } from "../vite-sandbox.shared.ts";

/**
 * The sandbox build is the same job in every host — inline Mermaid, pin the
 * result by hash — over the same document, which lives in `@vellum/core`. A
 * host runs it so the artifact lands in its own `dist`, and contributes nothing
 * else.
 */
export default sandboxConfig();

import { createContext, useContext } from "react";
import type { HostCapabilities } from "@vellum/core";

/**
 * The seam for host capabilities, shaped exactly like the renderer seam next to
 * it: the host constructs, the shell consumes (CLAUDE.md invariant 1).
 *
 * The default is an empty object rather than `null`, which is the one place
 * this differs from `DiagramRendererContext` and is deliberate. A missing
 * provider and a host that supplies nothing are the same situation — no
 * capabilities — so callers should not have to distinguish them. `null` would
 * make every read `caps?.openDocument` instead of `caps.openDocument`, and the
 * `?.` would quietly paper over a genuinely absent provider.
 *
 * A component asks whether a capability exists by looking for the member. That
 * is reading an injected parameter, not detecting a host: nothing here can tell
 * you *which* host supplied it, and nothing should ever try to.
 */
const EMPTY_CAPABILITIES: HostCapabilities = {};

export const HostCapabilitiesContext = createContext<HostCapabilities>(EMPTY_CAPABILITIES);

export function useHostCapabilities(): HostCapabilities {
  return useContext(HostCapabilitiesContext);
}

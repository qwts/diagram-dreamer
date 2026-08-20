/**
 * The wire format between the app and a diagram sandbox.
 *
 * Both sides of this boundary are ours, but only one of them is trusted. The
 * sandbox holds Mermaid, which has an XSS CVE history (SPEC §13) and is fed
 * documents we did not write; it runs at an opaque origin with no DOM access to
 * the app. `postMessage` is therefore the entire API surface between them, and
 * this file is that surface written down.
 *
 * Every message carries `v`, the protocol version. A sandbox asset can outlive
 * the app that loads it — a stale cache, a half-applied update — and a mismatch
 * that announces itself beats one that shows up as a diagram that never
 * arrives.
 */

export const PROTOCOL_VERSION = 1;

/** Sent by the app once the sandbox has announced itself. */
export interface RenderRequest {
  kind: "vellum:render";
  v: number;
  /** Correlates the reply. Renders may overlap; the last one wins. */
  requestId: string;
  source: string;
  /** Mermaid's own theme name, from document frontmatter (SPEC §5). */
  theme?: string | undefined;
  /** Shell chrome light/dark, so the sandbox can match its own background. */
  colorScheme: "light" | "dark";
  /** Honours prefers-reduced-motion; the app resolves it, the sandbox obeys. */
  reducedMotion: boolean;
}

/** First message out of the sandbox. Until it arrives, nothing else may be sent. */
export interface SandboxReady {
  kind: "vellum:ready";
  v: number;
  /** The Mermaid actually bundled, not the one anybody hoped for. */
  mermaidVersion: string;
}

export interface RenderSucceeded {
  kind: "vellum:rendered";
  v: number;
  requestId: string;
  /** CSS pixels of the rendered diagram, so the app can size the frame. */
  width: number;
  height: number;
}

export interface RenderFailed {
  kind: "vellum:failed";
  v: number;
  requestId: string;
  /**
   * Mermaid's own message, in Mermaid's own English. Deliberately not a
   * translation key: the app wraps it in a translated sentence rather than
   * pretending a library's parser output is localisable.
   */
  message: string;
  /** 1-based, relative to the block's source. Absent when unparseable. */
  line?: number | undefined;
}

export type SandboxMessage = SandboxReady | RenderSucceeded | RenderFailed;

export function isSandboxMessage(value: unknown): value is SandboxMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Partial<SandboxMessage>;
  return (
    message.v === PROTOCOL_VERSION &&
    (message.kind === "vellum:ready" ||
      message.kind === "vellum:rendered" ||
      message.kind === "vellum:failed")
  );
}

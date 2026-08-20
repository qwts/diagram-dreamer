/**
 * The untrusted half. This module runs **inside** the sandboxed iframe, never
 * in the app.
 *
 * SPEC §6 puts Mermaid behind a sandbox for two reasons at once. Security:
 * Mermaid has an XSS CVE history and diagram source arrives from files we did
 * not write. Isolation: Mermaid needs a real DOM, and there is no clean worker
 * offload, so it needs *a* document — just not ours.
 *
 * The iframe carries `sandbox="allow-scripts"` and no `allow-same-origin`, so
 * this code runs at an opaque origin: no access to the app's DOM, no storage,
 * no cookies, no top-level navigation. Its own CSP (see `sandbox.html`) then
 * forbids network access outright, which is what stops a compromise here from
 * becoming exfiltration. Everything it can do, it does through `postMessage`.
 */

import mermaid, { type MermaidConfig } from "mermaid";
// Read from the installed package rather than declared next to it. Mermaid
// exposes no `version` on its own API surface, and a hand-written constant here
// is a second place for the truth to live — exactly the drift the design-tokens
// package was built to stop.
import { version as MERMAID_VERSION } from "mermaid/package.json";
import {
  PROTOCOL_VERSION,
  type RenderFailed,
  type RenderRequest,
  type RenderSucceeded,
  type SandboxReady,
} from "./protocol";

/** Mermaid puts the offending line in its message; the gutter wants the number. */
const PARSE_LINE = /(?:^|\s)line\s+(\d+)/i;

function post(message: SandboxReady | RenderSucceeded | RenderFailed): void {
  // targetOrigin "*" because an opaque origin cannot name its parent, and the
  // payload is a size or an error string either way. The app authenticates the
  // other direction — it checks the message came from the frame it created.
  window.parent.postMessage(message, "*");
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown rendering error";
}

function errorLine(message: string): number | undefined {
  const match = PARSE_LINE.exec(message);
  if (!match?.[1]) return undefined;
  const line = Number.parseInt(match[1], 10);
  return Number.isFinite(line) ? line : undefined;
}

/**
 * A render can be superseded while Mermaid is still working — a keystroke in
 * the editor is enough. Only the newest request may write to the DOM, or an
 * older diagram lands on top of a newer one.
 */
let currentRequest = "";

async function render(request: RenderRequest): Promise<void> {
  currentRequest = request.requestId;
  const surface = document.getElementById("surface");
  if (!surface) return;

  mermaid.initialize({
    startOnLoad: false,
    // Non-negotiable, and the reason this file exists. `strict` sanitises
    // Mermaid's own HTML output; the sandbox is what covers everything strict
    // does not anticipate.
    securityLevel: "strict",
    // `DocumentModel.theme` is a plain string on purpose — the set of valid
    // theme names is Mermaid's to define, and restating it here would be a
    // second copy to keep in sync. So the cast is deliberate: a name Mermaid
    // does not know throws inside `render`, and the caller gets a diagnostic
    // card naming the theme, which is what a typo in frontmatter deserves.
    theme: (request.theme ?? (request.colorScheme === "dark" ? "dark" : "default")) as NonNullable<
      MermaidConfig["theme"]
    >,
    darkMode: request.colorScheme === "dark",
    // Matches the app's body font so a diagram does not read as a foreign
    // object dropped into the page. Bundled with the sandbox, never fetched.
    fontFamily: '"Inter Variable", Inter, system-ui, sans-serif',
  });

  try {
    // `mermaid.render` needs an id that is unique per call; a reused id makes
    // it reuse the previous definition's measurements.
    const { svg } = await mermaid.render(`d${request.requestId}`, request.source);
    if (currentRequest !== request.requestId) return;

    surface.innerHTML = svg;
    const node = surface.querySelector("svg");
    // Mermaid sizes its output responsively — a percentage width and a
    // `max-width` — because it expects to sit in a page that decides the width.
    // Here the opposite is true: the app owns zoom and pan and needs the
    // diagram's *natural* size to lay a frame out around it.
    //
    // The viewBox is that natural size, and pinning to it is not optional.
    // Simply dropping the width/height attributes leaves an SVG whose width
    // resolves against a container that is itself sized by its content — a
    // circular constraint that both browsers resolve to zero, so the diagram
    // renders correctly and is then invisible.
    if (node) {
      const viewBox = node
        .getAttribute("viewBox")
        ?.split(/[\s,]+/)
        .map(Number);
      node.style.maxWidth = "none";
      if (viewBox?.length === 4 && viewBox.every((n) => Number.isFinite(n))) {
        node.style.width = `${viewBox[2]}px`;
        node.style.height = `${viewBox[3]}px`;
      }
    }
    const box = node?.getBoundingClientRect();
    post({
      kind: "vellum:rendered",
      v: PROTOCOL_VERSION,
      requestId: request.requestId,
      width: Math.ceil(box?.width ?? 0),
      height: Math.ceil(box?.height ?? 0),
    });
  } catch (error) {
    if (currentRequest !== request.requestId) return;
    // Mermaid appends a partial error graphic to the body on failure. The app
    // renders its own diagnostic card, so clear it rather than showing both.
    surface.innerHTML = "";
    document.getElementById(`dd${request.requestId}`)?.remove();
    const message = errorMessage(error);
    post({
      kind: "vellum:failed",
      v: PROTOCOL_VERSION,
      requestId: request.requestId,
      message,
      line: errorLine(message),
    });
  }
}

export function startSandbox(): void {
  window.addEventListener("message", (event: MessageEvent<unknown>) => {
    // Only the embedder may drive this frame. Origin is unverifiable from an
    // opaque origin — the app is legitimately file:// when packaged and
    // http://localhost in development — so identity comes from the window
    // reference, which cannot be forged by page content.
    if (event.source !== window.parent) return;
    const data = event.data as Partial<RenderRequest> | null;
    if (typeof data !== "object" || data === null) return;
    if (data.kind !== "vellum:render" || data.v !== PROTOCOL_VERSION) return;
    if (typeof data.source !== "string" || typeof data.requestId !== "string") return;
    void render(data as RenderRequest);
  });

  post({
    kind: "vellum:ready",
    v: PROTOCOL_VERSION,
    mermaidVersion: MERMAID_VERSION,
  });
}

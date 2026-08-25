import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserHistory } from "@tanstack/react-router";
import { DiagramRenderer } from "@vellum/core";
import { DiagramRendererContext, HostCapabilitiesContext, getRouter } from "@vellum/shell";

import { webCapabilities } from "./capabilities.ts";

import "@vellum/shell/styles.css";

/**
 * The web host's composition root — the same shell as `apps/desktop`, wired to
 * a browser instead of a main process.
 *
 * Nothing here detects anything. This file *is* the answer to "which host is
 * this", so the shell never has to ask (CLAUDE.md invariant 2).
 */

/**
 * Browser history, where desktop uses memory history. A hosted SPA has a real
 * URL and should behave like it: back and forward work, a route is a link, and
 * the `?state=` fixture seam is addressable without the host reconstructing an
 * initial entry from `window.location` the way desktop must.
 *
 * The cost, stated plainly: `/welcome` is a real path, so a plain file server
 * must fall back to `index.html` for unknown paths. That is a static-hosting
 * setting, not a server — `vite preview` does it, and so does every static host
 * — and it is why the gates for this host run against `vite preview` rather
 * than a bare directory listing. Hash history would remove the requirement and
 * put a `#` in every URL; for a document renderer whose links are worth sharing,
 * the fallback rule is the cheaper of the two.
 */
const router = getRouter({ history: createBrowserHistory() });

/**
 * The only place a `DiagramRenderer` is constructed. Resolved against
 * `document.baseURI` for symmetry with desktop, not necessity: this host's base
 * is "/" so a bare path would also work, and keeping the two identical means
 * the line does not have to be re-reasoned per host.
 */
const diagramRenderer = new DiagramRenderer({
  sandboxUrl: new URL("sandbox.html", document.baseURI).href,
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root is missing from index.html");

createRoot(rootElement).render(
  <StrictMode>
    <DiagramRendererContext value={diagramRenderer}>
      <HostCapabilitiesContext value={webCapabilities}>
        <RouterProvider router={router} />
      </HostCapabilitiesContext>
    </DiagramRendererContext>
  </StrictMode>,
);

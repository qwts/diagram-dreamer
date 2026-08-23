import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { DiagramRenderer, type HostCapabilities } from "@vellum/core";
import { DiagramRendererContext, HostCapabilitiesContext, getRouter } from "@vellum/shell";

import "@vellum/shell/styles.css";

/**
 * The renderer loads from file:// inside Electron, where path and hash history
 * are both meaningless — so the shell always runs on memory history, chosen
 * here by the host rather than detected at runtime (CLAUDE.md invariant 2).
 *
 * The host still decides which entry to open with. Seeding it from the current
 * location keeps the `?state=` / `?doc=` / `?agent=` fixture seam addressable
 * when the app is served over http for the test gates.
 *
 * Electron loads the built renderer with `loadFile`, so `location.pathname` is
 * a filesystem path ending in `.html` — feeding that to the router would start
 * it on a route that does not exist and render the error boundary instead of
 * the workspace. Only a path that looks like an app route is used; anything
 * else falls back to "/". Keyed on the shape of the path rather than the
 * protocol, so this stays free of environment detection.
 */
function initialEntryFromLocation(): string {
  const { pathname, search } = window.location;
  const looksLikeAppRoute = pathname.startsWith("/") && !pathname.split("/").pop()?.includes(".");
  return `${looksLikeAppRoute ? pathname : "/"}${search}`;
}

const initialEntry = initialEntryFromLocation();
const router = getRouter({ history: createMemoryHistory({ initialEntries: [initialEntry] }) });

/**
 * The composition root, and the only place a `DiagramRenderer` is constructed.
 * The shell receives it through context and could equally receive `null` — the
 * host owns this decision, not the presentation layer (CLAUDE.md invariant 1).
 *
 * Resolved against `document.baseURI` rather than written as a bare path: the
 * built app uses a relative base so it can load from `file://` in Electron, and
 * an absolute `/sandbox.html` would point at the filesystem root there.
 */
const diagramRenderer = new DiagramRenderer({
  sandboxUrl: new URL("sandbox.html", document.baseURI).href,
});

/**
 * What this host can do (SPEC §4). Empty today, and deliberately not faked.
 *
 * Every member of `HostCapabilities` needs the main process behind it —
 * `openDocument` a native dialog, `saveDocument` a write to disk — and the
 * preload bridge that exposes them is a later milestone. Supplying handlers
 * that resolve to nothing would put stub logic in a composition root, which is
 * the opposite of leaving a seam (CLAUDE.md invariant 1).
 *
 * So the provider goes in now and the members arrive with the bridge. An empty
 * set is a legitimate state the contract is built to express, not a
 * placeholder: the shell must render sensibly for a host that offers nothing,
 * because the `?state=` fixture switcher is exactly that host.
 */
const hostCapabilities: HostCapabilities = {};

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root is missing from index.html");

createRoot(rootElement).render(
  <StrictMode>
    <DiagramRendererContext value={diagramRenderer}>
      <HostCapabilitiesContext value={hostCapabilities}>
        <RouterProvider router={router} />
      </HostCapabilitiesContext>
    </DiagramRendererContext>
  </StrictMode>,
);

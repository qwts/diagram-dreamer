import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";

import "./styles.css";
import "./i18n";
import { getRouter } from "./router";

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

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root is missing from index.html");

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

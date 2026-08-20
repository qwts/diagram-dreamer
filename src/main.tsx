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
 * when the app is served over http for the test gates; under file:// there is
 * no query string and this collapses to "/".
 */
const initialEntry = `${window.location.pathname}${window.location.search}` || "/";
const router = getRouter({ history: createMemoryHistory({ initialEntries: [initialEntry] }) });

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root is missing from index.html");

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

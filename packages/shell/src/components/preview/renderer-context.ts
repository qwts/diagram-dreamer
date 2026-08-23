import { createContext, useContext } from "react";
import type { DiagramRenderer } from "@vellum/core";

/**
 * The seam for the render pipeline. The shell never constructs a
 * `DiagramRenderer` — the host does, and hands it down (CLAUDE.md invariant 1).
 *
 * `null` is a first-class value here, not an error case: with no renderer
 * injected, every diagram frame shows its mount placeholder. That is what keeps
 * the fixtures and the `?state=` switcher working as pure presentation, and it
 * is the same shape the editor seam will take when CodeMirror lands.
 */
export const DiagramRendererContext = createContext<DiagramRenderer | null>(null);

export function useDiagramRenderer(): DiagramRenderer | null {
  return useContext(DiagramRendererContext);
}

import { useCallback, useEffect, useRef, useState } from "react";
import type { DiagramSurface, RenderResult } from "@vellum/core";

import { useDiagramRenderer } from "./renderer-context";
import { useTheme } from "@/components/common/theme-context";

export type SurfaceState =
  | { status: "absent" }
  | { status: "rendering" }
  | { status: "ready"; width: number; height: number }
  | { status: "failed"; message: string; line?: number | undefined };

interface Options {
  /** Names the sandbox iframe for assistive technology. */
  title: string;
  source: string | undefined;
  /** Mermaid's own theme name from document frontmatter, not the shell theme. */
  theme: string | undefined;
}

/**
 * Mounts an injected diagram sandbox into the returned ref and keeps it fed.
 *
 * Presentation glue, not logic: everything about *how* a diagram renders lives
 * in `@vellum/core`. This decides when to ask and where to put the result.
 *
 * **Two effects, deliberately.** Creating a surface loads a megabyte of Mermaid
 * into a fresh frame; rendering into an existing one is a `postMessage`. Source
 * and theme therefore drive only the second. Folding them together — which is
 * what this hook did at first — tears the sandbox down and rebuilds it on every
 * change, including every keystroke once a real editor is wired up. That is
 * precisely the case the render protocol's request ids and supersession exist
 * to handle, so collapsing the two would mean paying for a mechanism and then
 * refusing to use it.
 */
export function useDiagramSurface({ title, source, theme }: Options) {
  const renderer = useDiagramRenderer();
  const { resolved } = useTheme();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const surfaceRef = useRef<DiagramSurface | null>(null);
  const [state, setState] = useState<SurfaceState>({ status: "absent" });

  // A callback ref rather than a plain one: an effect keyed on a ref object
  // never learns when the node behind it changes. Keyed on the node itself, the
  // surface is created once a container exists and torn down if one goes away.
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainer(node);
  }, []);

  // The title names the frame but must not rebuild it — a diagram would be torn
  // down and re-rendered every time its accessible name changed. Read through a
  // ref so it participates in creation without being a dependency.
  const titleRef = useRef(title);
  titleRef.current = title;

  useEffect(() => {
    if (!renderer || !container) return;
    const surface = renderer.createSurface(titleRef.current);
    surfaceRef.current = surface;
    container.append(surface.element);
    return () => {
      surfaceRef.current = null;
      surface.destroy();
    };
  }, [renderer, container]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface || source === undefined) {
      setState({ status: "absent" });
      return;
    }

    setState({ status: "rendering" });
    let live = true;
    void surface
      .render({
        source,
        theme,
        colorScheme: resolved,
        // Read once per render rather than subscribed: a diagram is redrawn on
        // any theme or source change anyway, and the sandbox re-reads the query
        // itself through its own stylesheet.
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      })
      .then((result: RenderResult) => {
        if (!live) return;
        setState(
          result.ok
            ? { status: "ready", width: result.width, height: result.height }
            : { status: "failed", message: result.message, line: result.line },
        );
      });

    return () => {
      live = false;
    };
    // `renderer` and `container` are dependencies because they gate the effect
    // above: when either changes there is a new surface, and it needs its first
    // render. React runs both cleanups before either effect re-runs, so
    // `surfaceRef` always holds the surface this render belongs to.
  }, [renderer, container, source, theme, resolved]);

  return { containerRef, state };
}

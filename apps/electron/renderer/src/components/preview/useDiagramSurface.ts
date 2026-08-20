import { useEffect, useRef, useState } from "react";
import type { RenderResult } from "@vellum/core";

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
 * Mounts an injected diagram sandbox into `containerRef` and keeps it fed.
 *
 * Presentation glue, not logic: everything about *how* a diagram renders lives
 * in `@vellum/core`. This decides when to ask and where to put the result.
 */
export function useDiagramSurface({ title, source, theme }: Options) {
  const renderer = useDiagramRenderer();
  const { resolved } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<SurfaceState>({ status: "absent" });

  // The title names the frame but must not rebuild it — a diagram would be torn
  // down and re-rendered every time its accessible name changed. Read through a
  // ref so it participates in creation without being a dependency.
  const titleRef = useRef(title);
  titleRef.current = title;

  useEffect(() => {
    const container = containerRef.current;
    if (!renderer || !container || source === undefined) {
      setState({ status: "absent" });
      return;
    }

    const surface = renderer.createSurface(titleRef.current);
    container.append(surface.element);
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
      surface.destroy();
    };
  }, [renderer, source, theme, resolved]);

  return { containerRef, state };
}

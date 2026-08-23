/**
 * The shell's public surface — everything a host composition root needs, and
 * nothing else.
 *
 * Hosts import from here rather than reaching into `src/`. That is what makes
 * the seam real: the shell can be rearranged internally without touching a
 * host, and a host cannot quietly grow a dependency on a component's location.
 *
 * Note what is *not* exported: no component, no route, no fixture. A host
 * composes the app by handing dependencies to `getRouter` and the renderer
 * context, never by assembling screens itself (CLAUDE.md invariant 1).
 */

export { getRouter } from "./router";
export { DiagramRendererContext, useDiagramRenderer } from "./components/preview/renderer-context";
export { RTL_LANGUAGES, isRtlLanguage } from "./i18n";

/**
 * Side-effect import: i18next is configured with its resources bundled
 * synchronously at module load (CLAUDE.md invariant 4). A host that imports
 * anything from this package gets a configured i18n, which is the only ordering
 * that guarantees no raw key ever renders.
 */
import "./i18n";

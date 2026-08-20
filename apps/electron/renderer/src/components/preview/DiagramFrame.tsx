import { useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  Bot,
  CircleAlert,
  Copy,
  Crosshair,
  FileImage,
  FileCode2,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import { Toolbar } from "@/components/common/Toolbar";
import { VellumButton } from "@/components/common/VellumButton";
import { DiagnosticCard } from "./DiagnosticCard";
import { useDiagramSurface } from "./useDiagramSurface";
import { testIds } from "@/testids";
import type { DiagramBlock } from "@/types/shell";

/**
 * Pan step in CSS pixels. Physical directions on purpose: the arrow keys move
 * the view across a spatial canvas, so they are not mirrored under RTL the way
 * the toolbars' roving focus is. Reading direction does not change which way is
 * left on a diagram.
 */
const PAN_STEP = 24;
const PAN_STEP_COARSE = 96;

/** Matches the zoom buttons' range, so every control agrees on the limits. */
const ZOOM_MIN = 25;
const ZOOM_MAX = 400;

interface DiagramFrameProps {
  block: DiagramBlock;
  onCopy?: ((blockId: string) => void) | undefined;
  onExportSvg?: ((blockId: string) => void) | undefined;
  onExportPng?: ((blockId: string) => void) | undefined;
  onAskAgent?: ((blockId: string) => void) | undefined;
  /** Mermaid theme for the whole document (SPEC §5 frontmatter). */
  theme?: string | undefined;
}

/**
 * Card chrome around a diagram. Mermaid itself renders inside a sandboxed
 * iframe supplied by `@vellum/core` — this component never renders a diagram,
 * it decides where one goes and what to show when there isn't one.
 */
export function DiagramFrame({
  block,
  onCopy,
  onExportSvg,
  onExportPng,
  onAskAgent,
  theme,
}: DiagramFrameProps) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const title = block.accTitle ?? t("preview.frame.label", { id: block.id });
  const { containerRef, state: surface } = useDiagramSurface({
    title,
    source: block.source,
    theme,
  });

  /**
   * Arrow keys pan; Shift takes a coarser step for crossing a large diagram
   * without holding a key down. Local view state, exactly as `zoom` already is
   * — no document is mutated, so this stays inside the shell's remit.
   */
  const onViewportKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? PAN_STEP_COARSE : PAN_STEP;
    const delta = {
      ArrowLeft: { x: step, y: 0 },
      ArrowRight: { x: -step, y: 0 },
      ArrowUp: { x: 0, y: step },
      ArrowDown: { x: 0, y: -step },
    }[event.key];
    if (!delta) return;
    event.preventDefault();
    setPan((current) => ({ x: current.x + delta.x, y: current.y + delta.y }));
  };

  /**
   * Fit the diagram to the frame, rather than merely undoing zoom and pan.
   *
   * Until the sandbox landed there was nothing to fit *to* — no diagram had a
   * measured size — so "fit to frame" and "reset zoom" were the same handler
   * and the distinction was a label. Now the sandbox reports its rendered size,
   * so this can scale down to whatever the viewport can show. Never scales
   * *up*: a small diagram blown up to fill the pane is not what anyone means by
   * fitting, and 100% stays the ceiling.
   */
  const fitToFrame = () => {
    setPan({ x: 0, y: 0 });
    const available = viewportRef.current?.clientWidth;
    if (surface.status !== "ready" || !available || surface.width === 0) {
      setZoom(100);
      return;
    }
    const ratio = Math.floor((available / surface.width) * 100);
    setZoom(Math.max(ZOOM_MIN, Math.min(100, ratio)));
  };

  const severity = block.diagnostic?.severity ?? "error";
  const isWarning = severity === "warning";

  // Two ways a block can be broken, and the reader is shown one card either
  // way. The model's own diagnostic wins: it describes the document, while a
  // live failure describes this attempt at rendering it.
  const modelFailed = block.state === "error" && block.diagnostic !== undefined;
  const liveFailed = !modelFailed && surface.status === "failed";
  const failed = modelFailed || liveFailed;

  return (
    <article
      data-testid={testIds.preview.diagramFrame}
      // Prefer the diagram's own accessible name over the block id, which
      // identifies without describing (SPEC §9).
      aria-label={title}
      {...(block.accDescr !== undefined && { "aria-description": block.accDescr })}
      className="group rounded-md border border-border bg-surface-raised"
    >
      <header
        data-testid={testIds.preview.captionBar}
        className="flex flex-wrap items-center justify-between gap-sm border-b border-border px-md py-sm"
      >
        <div className="flex items-center gap-sm">
          <span data-testid={testIds.preview.blockId} className="font-mono text-body-sm text-ink">
            {block.id}
          </span>
          <span
            data-testid={testIds.preview.diagramType}
            className="rounded-sm border border-border bg-muted px-xs py-2xs font-mono text-body-sm text-slate"
          >
            {block.diagramType}
          </span>
          {failed ? (
            <span
              className={`inline-flex items-center gap-xs text-body-sm ${
                modelFailed && isWarning ? "text-warning" : "text-danger"
              }`}
            >
              <CircleAlert className="size-3.5" aria-hidden="true" />
              {t("preview.error.line", {
                line: modelFailed
                  ? (block.diagnostic?.line ?? block.startLine)
                  : ((surface.status === "failed" ? surface.line : undefined) ?? block.startLine),
              })}
            </span>
          ) : null}
        </div>

        <Toolbar
          label={t("preview.frame.toolbar")}
          data-testid={testIds.preview.hoverToolbar}
          className="opacity-100 vellum-motion transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        >
          <VellumButton
            variant="ghost"
            size="icon"
            aria-label={t("preview.frame.copy")}
            data-testid={testIds.preview.copy}
            onClick={() => onCopy?.(block.id)}
          >
            <Copy className="size-4" aria-hidden="true" />
          </VellumButton>
          <VellumButton
            variant="ghost"
            size="icon"
            aria-label={t("preview.frame.exportSvg")}
            data-testid={testIds.preview.exportSvg}
            onClick={() => onExportSvg?.(block.id)}
          >
            <FileCode2 className="size-4" aria-hidden="true" />
          </VellumButton>
          <VellumButton
            variant="ghost"
            size="icon"
            aria-label={t("preview.frame.exportPng")}
            data-testid={testIds.preview.exportPng}
            onClick={() => onExportPng?.(block.id)}
          >
            <FileImage className="size-4" aria-hidden="true" />
          </VellumButton>
          <VellumButton
            variant="ghost"
            size="icon"
            aria-label={t("preview.frame.askAgent")}
            data-testid={testIds.preview.askAgent}
            onClick={() => onAskAgent?.(block.id)}
          >
            <Bot className="size-4" aria-hidden="true" />
          </VellumButton>
        </Toolbar>
      </header>

      {modelFailed && block.diagnostic ? (
        <DiagnosticCard
          severity={severity}
          message={t(block.diagnostic.messageKey, block.diagnostic.messageValues ?? {})}
          line={block.diagnostic.line}
        />
      ) : liveFailed && surface.status === "failed" ? (
        <DiagnosticCard
          severity="error"
          // Mermaid's parser speaks English and only English. Wrapping its text
          // in a translated sentence is honest; pretending the text itself is
          // localisable would not be.
          message={t("preview.error.mermaid", { message: surface.message })}
          line={surface.line ?? block.startLine}
        />
      ) : (
        <div className="p-lg">
          {/*
           * The viewport clips; the mount slot moves inside it. SPEC §9 requires
           * pan "via keyboard", so the viewport itself is the control: focusable,
           * named, and driven by the arrow keys. That is the affordance a
           * pointer-only pan would leave without an equivalent.
           *
           * Deliberately not `role="application"` — that would suppress the
           * screen reader's own arrow-key navigation everywhere inside. This
           * stays a plain focusable group and only claims the arrow keys while
           * it holds focus, which is why the handler calls preventDefault on
           * exactly the four keys it consumes and nothing else.
           */}
          <div
            data-testid={testIds.preview.viewport}
            ref={viewportRef}
            role="group"
            tabIndex={0}
            aria-label={t("preview.frame.viewport")}
            onKeyDown={onViewportKeyDown}
            className="overflow-hidden rounded-md"
          >
            <div
              data-testid={testIds.preview.mountSlot}
              ref={containerRef}
              className={
                surface.status === "ready"
                  ? "flex justify-center rounded-md bg-paper"
                  : "flex min-h-48 items-center justify-center rounded-md border border-dashed border-border bg-paper text-body-sm text-slate"
              }
              style={{
                zoom: `${zoom}%`,
                translate: `${pan.x}px ${pan.y}px`,
              }}
            >
              {/*
               * The sandbox iframe is appended here by `useDiagramSurface`. The
               * placeholder below is what is shown when no renderer is injected
               * — the fixture-driven states the `?state=` switcher exercises —
               * and while the first render is in flight.
               */}
              {surface.status === "ready" ? null : block.state === "loading" ||
                surface.status === "rendering" ? (
                <span className="inline-flex items-center gap-sm">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {t("preview.frame.loading")}
                </span>
              ) : (
                <span>{t("preview.frame.mount")}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {!failed ? (
        <footer className="flex items-center justify-between gap-sm border-t border-border px-md py-sm">
          <span className="text-body-sm text-slate">
            {t("preview.frame.zoomLevel", { value: zoom })}
          </span>
          <Toolbar label={t("preview.frame.toolbar")}>
            <VellumButton
              variant="ghost"
              size="icon"
              aria-label={t("preview.frame.zoomOut")}
              data-testid={testIds.preview.zoomOut}
              onClick={() => setZoom((value) => Math.max(ZOOM_MIN, value - 25))}
            >
              <Minus className="size-4" aria-hidden="true" />
            </VellumButton>
            <VellumButton
              variant="ghost"
              size="icon"
              aria-label={t("preview.frame.zoomIn")}
              data-testid={testIds.preview.zoomIn}
              onClick={() => setZoom((value) => Math.min(ZOOM_MAX, value + 25))}
            >
              <Plus className="size-4" aria-hidden="true" />
            </VellumButton>
            <VellumButton
              variant="ghost"
              size="icon"
              aria-label={t("preview.frame.panReset")}
              data-testid={testIds.preview.panReset}
              disabled={pan.x === 0 && pan.y === 0}
              onClick={() => setPan({ x: 0, y: 0 })}
            >
              <Crosshair className="size-4" aria-hidden="true" />
            </VellumButton>
            <VellumButton
              variant="ghost"
              size="icon"
              aria-label={t("preview.frame.zoomReset")}
              data-testid={testIds.preview.zoomReset}
              onClick={() => setZoom(100)}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
            </VellumButton>
            <VellumButton
              variant="ghost"
              size="icon"
              aria-label={t("preview.frame.zoomFit")}
              data-testid={testIds.preview.zoomFit}
              onClick={fitToFrame}
            >
              <Maximize2 className="size-4" aria-hidden="true" />
            </VellumButton>
          </Toolbar>
        </footer>
      ) : null}
    </article>
  );
}

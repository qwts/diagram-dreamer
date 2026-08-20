import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bot,
  CircleAlert,
  Copy,
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
import { testIds } from "@/testids";
import type { DiagramBlock } from "@/types/shell";

interface DiagramFrameProps {
  block: DiagramBlock;
  onCopy?: ((blockId: string) => void) | undefined;
  onExportSvg?: ((blockId: string) => void) | undefined;
  onExportPng?: ((blockId: string) => void) | undefined;
  onAskAgent?: ((blockId: string) => void) | undefined;
}

/**
 * Card chrome around a diagram. A sandboxed iframe mounts into the mount slot
 * later; this component never renders Mermaid itself.
 */
export function DiagramFrame({
  block,
  onCopy,
  onExportSvg,
  onExportPng,
  onAskAgent,
}: DiagramFrameProps) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(100);
  const severity = block.diagnostic?.severity ?? "error";
  const isWarning = severity === "warning";
  const diagnosticTone = isWarning
    ? "bg-warning-surface text-warning"
    : "bg-danger-surface text-danger";

  return (
    <article
      data-testid={testIds.preview.diagramFrame}
      // Prefer the diagram's own accessible name over the block id, which
      // identifies without describing (SPEC §9).
      aria-label={block.accTitle ?? t("preview.frame.label", { id: block.id })}
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
          {block.state === "error" ? (
            <span
              className={`inline-flex items-center gap-xs text-body-sm ${isWarning ? "text-warning" : "text-danger"}`}
            >
              <CircleAlert className="size-3.5" aria-hidden="true" />
              {t("preview.error.line", { line: block.diagnostic?.line ?? block.startLine })}
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

      {block.state === "error" && block.diagnostic ? (
        <div
          data-testid={testIds.preview.errorCard}
          data-severity={severity}
          role="group"
          aria-label={t(isWarning ? "preview.warning.title" : "preview.error.title")}
          className={`m-md rounded-md p-md ${diagnosticTone}`}
        >
          <div className="flex items-start gap-sm">
            <CircleAlert className="mt-2xs size-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-body-md font-medium">
                {t(isWarning ? "preview.warning.title" : "preview.error.title")}
              </p>
              <p className="mt-xs font-mono text-body-sm">
                {t(block.diagnostic.messageKey, block.diagnostic.messageValues ?? {})}
              </p>
              <p data-testid={testIds.preview.errorLineRef} className="mt-xs text-body-sm">
                {t("preview.error.line", { line: block.diagnostic.line })}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-lg">
          <div
            data-testid={testIds.preview.mountSlot}
            className="flex min-h-48 items-center justify-center rounded-md border border-dashed border-border bg-paper text-body-sm text-slate"
            style={{ zoom: `${zoom}%` }}
          >
            {block.state === "loading" ? (
              <span className="inline-flex items-center gap-sm">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {t("preview.frame.loading")}
              </span>
            ) : (
              <span>{t("preview.frame.mount")}</span>
            )}
          </div>
        </div>
      )}

      {block.state !== "error" ? (
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
              onClick={() => setZoom((value) => Math.max(25, value - 25))}
            >
              <Minus className="size-4" aria-hidden="true" />
            </VellumButton>
            <VellumButton
              variant="ghost"
              size="icon"
              aria-label={t("preview.frame.zoomIn")}
              data-testid={testIds.preview.zoomIn}
              onClick={() => setZoom((value) => Math.min(400, value + 25))}
            >
              <Plus className="size-4" aria-hidden="true" />
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
              onClick={() => setZoom(100)}
            >
              <Maximize2 className="size-4" aria-hidden="true" />
            </VellumButton>
          </Toolbar>
        </footer>
      ) : null}
    </article>
  );
}

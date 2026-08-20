import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CircleAlert, Type, WrapText } from "lucide-react";
import { Toolbar } from "@/components/common/Toolbar";
import { VellumButton } from "@/components/common/VellumButton";
import { testIds } from "@/testids";
import type { Diagnostic, DocumentModel } from "@/types/shell";
import { cn } from "@/lib/utils";

interface EditorHostProps {
  document: DocumentModel;
  onFormat?: (() => void) | undefined;
  onToggleWrap?: ((wrap: boolean) => void) | undefined;
}

/**
 * Frame only. A CodeMirror instance mounts into the scroll container later —
 * this component owns the gutter, toolbar and scroll chrome, nothing else.
 */
export function EditorHost({ document, onFormat, onToggleWrap }: EditorHostProps) {
  const { t } = useTranslation();
  const [wrap, setWrap] = useState(true);

  const byLine = new Map<number, Diagnostic>();
  for (const diagnostic of document.diagnostics) byLine.set(diagnostic.line, diagnostic);

  const lines = Array.from({ length: Math.max(document.lineCount, 24) }, (_, index) => index + 1);

  return (
    <section
      aria-label={t("workspace.region.editor")}
      data-testid={testIds.editor.host}
      className="flex h-full min-h-0 flex-col bg-paper"
    >
      <div className="flex items-center justify-between gap-sm border-b border-border bg-surface-raised px-md py-sm">
        <span className="text-label-caps uppercase text-slate">{t("editor.title")}</span>
        <Toolbar label={t("editor.toolbar.label")} data-testid={testIds.editor.toolbar}>
          <VellumButton
            variant="ghost"
            size="icon"
            aria-label={t("editor.toolbar.wrap")}
            aria-pressed={wrap}
            data-testid={testIds.editor.wrapToggle}
            onClick={() => {
              setWrap((value) => !value);
              onToggleWrap?.(!wrap);
            }}
          >
            <WrapText className="size-4" aria-hidden="true" />
          </VellumButton>
          <VellumButton
            variant="ghost"
            size="icon"
            aria-label={t("editor.toolbar.format")}
            data-testid={testIds.editor.formatAction}
            onClick={onFormat}
          >
            <Type className="size-4" aria-hidden="true" />
          </VellumButton>
        </Toolbar>
      </div>

      <div
        data-testid={testIds.editor.scrollContainer}
        className="flex min-h-0 flex-1 overflow-auto font-mono text-code"
        tabIndex={0}
      >
        <ol
          data-testid={testIds.editor.gutter}
          aria-label={t("editor.gutter.label")}
          className="sticky start-0 select-none border-e border-border bg-surface-raised py-sm text-end text-slate"
        >
          {lines.map((line) => {
            const diagnostic = byLine.get(line);
            return (
              <li
                key={line}
                data-testid={testIds.editor.gutterLine}
                className="flex h-[1.6em] items-center justify-end gap-xs ps-sm pe-xs"
              >
                {diagnostic ? (
                  <span
                    data-testid={testIds.editor.errorBadge}
                    title={t(
                      diagnostic.severity === "error"
                        ? "editor.gutter.errorBadge"
                        : "editor.gutter.warningBadge",
                      { line },
                    )}
                    aria-label={t(
                      diagnostic.severity === "error"
                        ? "editor.gutter.errorBadge"
                        : "editor.gutter.warningBadge",
                      { line },
                    )}
                    className={cn(
                      "flex items-center",
                      diagnostic.severity === "error" ? "text-danger" : "text-warning",
                    )}
                  >
                    {diagnostic.severity === "error" ? (
                      <CircleAlert className="size-3.5" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="size-3.5" aria-hidden="true" />
                    )}
                  </span>
                ) : (
                  <span className="size-3.5" aria-hidden="true" />
                )}
                <span className="w-6 tabular-nums">{line}</span>
              </li>
            );
          })}
        </ol>

        <div
          data-testid={testIds.editor.mountSlot}
          className="min-w-0 flex-1 py-sm ps-md pe-md text-ink"
        >
          {document.sourcePreview.map((line, index) => {
            const diagnostic = byLine.get(index + 1);
            return (
              <p
                key={`${index}-${line}`}
                className={cn(
                  "h-[1.6em] whitespace-pre",
                  wrap && "whitespace-pre-wrap",
                  diagnostic?.severity === "error" && "underline decoration-danger decoration-wavy",
                  diagnostic?.severity === "warning" && "underline decoration-warning decoration-dotted",
                )}
              >
                {line || "\u00a0"}
              </p>
            );
          })}
          <p className="mt-md text-body-sm text-slate">{t("editor.placeholder")}</p>
        </div>
      </div>
    </section>
  );
}

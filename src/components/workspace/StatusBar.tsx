import { useTranslation } from "react-i18next";
import { CircleAlert, MapPin, Package } from "lucide-react";
import { testIds } from "@/testids";
import type { DocumentModel } from "@/types/shell";

/**
 * The bar keeps role="status" (CLAUDE.md invariant 7 requires a status
 * landmark), which implies aria-live="polite" for everything inside it. Cursor
 * position and Mermaid version opt out with aria-live="off" — otherwise every
 * keystroke would be announced once a real editor mounts. Only the diagnostics
 * count is genuinely live, and it inherits polite from the container rather
 * than nesting a second live region inside one.
 */
export function StatusBar({ document }: { document: DocumentModel }) {
  const { t } = useTranslation();
  const count = document.diagnostics.length;
  // Warnings must never borrow danger tokens (CLAUDE.md invariant 3), so the
  // count only goes red when at least one diagnostic is actually an error.
  const hasError = document.diagnostics.some((diagnostic) => diagnostic.severity === "error");
  const countTone = count === 0 ? "" : hasError ? "text-danger" : "text-warning";

  return (
    <div
      role="status"
      aria-label={t("workspace.status.label")}
      data-testid={testIds.workspace.statusBar}
      className="flex flex-wrap items-center gap-md border-t border-border bg-surface-raised px-md py-xs text-body-sm text-slate"
    >
      <span
        data-testid={testIds.workspace.cursorPosition}
        aria-live="off"
        className="inline-flex items-center gap-xs"
      >
        <MapPin className="size-3.5" aria-hidden="true" />
        {t("workspace.status.cursor", {
          line: document.cursor.line,
          column: document.cursor.column,
        })}
      </span>
      <span
        data-testid={testIds.workspace.mermaidVersion}
        aria-live="off"
        className="inline-flex items-center gap-xs"
      >
        <Package className="size-3.5" aria-hidden="true" />
        {t("workspace.status.mermaid", { version: document.mermaidVersion })}
      </span>
      <span
        data-testid={testIds.workspace.diagnosticsCount}
        className={`inline-flex items-center gap-xs ${countTone}`}
      >
        <CircleAlert className="size-3.5" aria-hidden="true" />
        {count > 0
          ? t("workspace.status.diagnostics", { count })
          : t("workspace.status.noDiagnostics")}
      </span>
      <span aria-live="off" className="ms-auto text-slate">
        {t("workspace.regionHint")}
      </span>
    </div>
  );
}

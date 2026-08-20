import { useTranslation } from "react-i18next";
import { CircleAlert, MapPin, Package } from "lucide-react";
import { testIds } from "@/testids";
import type { DocumentModel } from "@/types/shell";

export function StatusBar({ document }: { document: DocumentModel }) {
  const { t } = useTranslation();
  const count = document.diagnostics.length;

  return (
    <div
      role="status"
      aria-label={t("workspace.status.label")}
      data-testid={testIds.workspace.statusBar}
      className="flex flex-wrap items-center gap-md border-t border-border bg-surface-raised px-md py-xs text-body-sm text-slate"
    >
      <span data-testid={testIds.workspace.cursorPosition} className="inline-flex items-center gap-xs">
        <MapPin className="size-3.5" aria-hidden="true" />
        {t("workspace.status.cursor", { line: document.cursor.line, column: document.cursor.column })}
      </span>
      <span data-testid={testIds.workspace.mermaidVersion} className="inline-flex items-center gap-xs">
        <Package className="size-3.5" aria-hidden="true" />
        {t("workspace.status.mermaid", { version: document.mermaidVersion })}
      </span>
      <span
        data-testid={testIds.workspace.diagnosticsCount}
        aria-live="polite"
        className={`inline-flex items-center gap-xs ${count > 0 ? "text-danger" : ""}`}
      >
        <CircleAlert className="size-3.5" aria-hidden="true" />
        {count > 0 ? t("workspace.status.diagnostics", { count }) : t("workspace.status.noDiagnostics")}
      </span>
      <span className="ms-auto text-slate">{t("workspace.regionHint")}</span>
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { CircleAlert } from "lucide-react";

import { testIds } from "@/testids";
import type { DiagnosticSeverity } from "@/types/shell";

interface DiagnosticCardProps {
  severity: DiagnosticSeverity;
  /** Already translated, or verbatim from Mermaid — this component renders it. */
  message: string;
  /**
   * Document line, when one is known. A failure that has no line — a sandbox
   * that never started — shows no line reference: pointing at the opening
   * fence would be a guess presented as a fact, and the reader would go there
   * and find nothing wrong.
   */
  line?: number | undefined;
}

/**
 * One diagnostic, one card. Shared by the two things that can produce one: a
 * document model that arrived already knowing a block is broken, and a live
 * render that just failed. They look identical because to a reader they *are*
 * identical — where the finding came from is not the reader's problem.
 *
 * Warnings use `warning` tokens and errors use `danger` (DESIGN.md), and the
 * severity is also carried in `data-severity` and in the group's accessible
 * name, so it is never signalled by colour alone.
 */
export function DiagnosticCard({ severity, message, line }: DiagnosticCardProps) {
  const { t } = useTranslation();
  const isWarning = severity === "warning";

  return (
    <div
      data-testid={testIds.preview.errorCard}
      data-severity={severity}
      role="group"
      aria-label={t(isWarning ? "preview.warning.title" : "preview.error.title")}
      className={`m-md rounded-md p-md ${
        isWarning ? "bg-warning-surface text-warning" : "bg-danger-surface text-danger"
      }`}
    >
      <div className="flex items-start gap-sm">
        <CircleAlert className="mt-2xs size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-body-md font-medium">
            {t(isWarning ? "preview.warning.title" : "preview.error.title")}
          </p>
          <p className="mt-xs font-mono text-body-sm">{message}</p>
          {line === undefined ? null : (
            <p data-testid={testIds.preview.errorLineRef} className="mt-xs text-body-sm">
              {t("preview.error.line", { line })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

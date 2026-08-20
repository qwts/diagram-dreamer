import { useTranslation } from "react-i18next";
import { Check, GitCompare, X } from "lucide-react";
import { VellumButton } from "@/components/common/VellumButton";
import { StatusPill } from "@/components/common/StatusPill";
import { testIds } from "@/testids";
import type { DiffPreview } from "@/types/shell";

export function DiffPreviewCard({
  diff,
  onAccept,
  onReject,
}: {
  diff: DiffPreview;
  onAccept?: ((id: string) => void) | undefined;
  onReject?: ((id: string) => void) | undefined;
}) {
  const { t } = useTranslation();

  return (
    <div
      data-testid={testIds.agent.diff}
      role="group"
      aria-label={t("agent.diff.title")}
      className="rounded-md border border-border bg-surface-raised p-md"
    >
      <div className="flex items-center gap-sm">
        <GitCompare className="size-4 text-lagoon" aria-hidden="true" />
        <p className="text-body-md font-medium text-ink">{t("agent.diff.title")}</p>
      </div>
      <p className="mt-xs font-mono text-body-sm text-slate">
        {t("agent.diff.file", { file: diff.filePath })}
      </p>

      <div className="mt-md grid gap-sm md:grid-cols-2">
        <div data-testid={testIds.agent.diffBefore}>
          <p className="text-label-caps text-slate">{t("agent.diff.before")}</p>
          <pre
            tabIndex={0}
            className="mt-xs overflow-auto rounded-sm border border-border bg-paper p-sm font-mono text-body-sm text-slate"
          >
            {diff.before.map((line) => (
              <div key={line} className="whitespace-pre">
                <span aria-hidden="true" className="me-sm text-danger">
                  -
                </span>
                {line}
              </div>
            ))}
          </pre>
        </div>
        <div data-testid={testIds.agent.diffAfter}>
          <p className="text-label-caps text-slate">{t("agent.diff.after")}</p>
          <pre
            tabIndex={0}
            className="mt-xs overflow-auto rounded-sm border border-border bg-paper p-sm font-mono text-body-sm text-ink"
          >
            {diff.after.map((line) => (
              <div key={line} className="whitespace-pre">
                <span aria-hidden="true" className="me-sm text-success">
                  +
                </span>
                {line}
              </div>
            ))}
          </pre>
        </div>
      </div>

      {diff.status === "pending" ? (
        <div className="mt-md flex flex-wrap gap-sm">
          <VellumButton
            variant="primary"
            data-testid={testIds.agent.diffAccept}
            onClick={() => onAccept?.(diff.id)}
          >
            {t("agent.diff.accept")}
          </VellumButton>
          <VellumButton data-testid={testIds.agent.diffReject} onClick={() => onReject?.(diff.id)}>
            {t("agent.diff.reject")}
          </VellumButton>
        </div>
      ) : (
        <div className="mt-md" data-testid={testIds.agent.diffStatus}>
          <StatusPill
            tone={diff.status === "accepted" ? "success" : "danger"}
            icon={
              diff.status === "accepted" ? (
                <Check className="size-3.5" />
              ) : (
                <X className="size-3.5" />
              )
            }
          >
            {t(`agent.diff.status.${diff.status}`)}
          </StatusPill>
        </div>
      )}
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { Check, CircleDashed, CircleX, Loader2, ListChecks, Wrench } from "lucide-react";
import { StatusPill } from "@/components/common/StatusPill";
import { testIds } from "@/testids";
import type { AgentItem, PlanStepStatus, ToolCallStatus } from "@/types/shell";

const toolTone: Record<ToolCallStatus, "neutral" | "lagoon" | "success" | "danger"> = {
  pending: "neutral",
  running: "lagoon",
  success: "success",
  failed: "danger",
};

function ToolIcon({ status }: { status: ToolCallStatus }) {
  if (status === "running") return <Loader2 className="size-3.5 animate-spin" />;
  if (status === "success") return <Check className="size-3.5" />;
  if (status === "failed") return <CircleX className="size-3.5" />;
  return <CircleDashed className="size-3.5" />;
}

function StepIcon({ status }: { status: PlanStepStatus }) {
  if (status === "done") return <Check className="size-3.5 text-success" aria-hidden="true" />;
  if (status === "active")
    return <Loader2 className="size-3.5 animate-spin text-lagoon" aria-hidden="true" />;
  return <CircleDashed className="size-3.5 text-slate" aria-hidden="true" />;
}

export function SessionTranscript({ items }: { items: AgentItem[] }) {
  const { t } = useTranslation();

  return (
    <ol
      data-testid={testIds.agent.transcript}
      aria-label={t("agent.transcript.label")}
      className="flex flex-col gap-md"
    >
      {items.map((item) => {
        if (item.kind === "text") {
          return (
            <li
              key={item.id}
              data-testid={testIds.agent.textItem}
              className="text-body-md text-ink"
            >
              {t(item.bodyKey)}
            </li>
          );
        }

        if (item.kind === "plan") {
          return (
            <li
              key={item.id}
              data-testid={testIds.agent.planItem}
              className="rounded-md border border-border bg-surface-raised p-md"
            >
              <p className="flex items-center gap-xs text-label-caps text-slate">
                <ListChecks className="size-3.5" aria-hidden="true" />
                {t("agent.plan.label")}
              </p>
              <ul className="mt-sm flex flex-col gap-xs">
                {item.steps.map((step) => (
                  <li
                    key={step.id}
                    data-testid={testIds.agent.planStep}
                    className="flex items-center gap-sm text-body-sm text-ink"
                  >
                    <StepIcon status={step.status} />
                    <span>{t(step.labelKey)}</span>
                    <span className="text-slate">· {t(`agent.plan.status.${step.status}`)}</span>
                  </li>
                ))}
              </ul>
            </li>
          );
        }

        return (
          <li
            key={item.id}
            data-testid={testIds.agent.toolCall}
            className="flex flex-wrap items-center justify-between gap-sm rounded-md border border-border bg-surface-raised px-md py-sm"
          >
            <span className="flex min-w-0 items-center gap-sm font-mono text-body-sm text-ink">
              <Wrench className="size-3.5 shrink-0 text-slate" aria-hidden="true" />
              <span className="truncate">
                {item.toolName} · {item.target}
              </span>
            </span>
            <StatusPill
              tone={toolTone[item.status]}
              icon={<ToolIcon status={item.status} />}
              data-testid={testIds.agent.toolCallStatus}
            >
              {t(`agent.toolCall.status.${item.status}`)}
            </StatusPill>
          </li>
        );
      })}
    </ol>
  );
}

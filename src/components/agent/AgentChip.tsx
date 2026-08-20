import { useTranslation } from "react-i18next";
import { Bot, BotOff, Loader2, ShieldQuestion } from "lucide-react";
import { testIds } from "@/testids";
import type { AgentConnectionState } from "@/types/shell";
import { cn } from "@/lib/utils";

const tones: Record<AgentConnectionState, string> = {
  disconnected: "border-border bg-muted text-slate",
  idle: "border-border bg-surface-raised text-slate",
  streaming: "border-lagoon/50 bg-lagoon-surface text-lagoon",
  "awaiting-permission":
    "border-lagoon bg-lagoon-surface text-lagoon ring-2 ring-lagoon vellum-pulse",
};

function Icon({ state }: { state: AgentConnectionState }) {
  if (state === "disconnected") return <BotOff className="size-3.5" aria-hidden="true" />;
  if (state === "streaming")
    return <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />;
  if (state === "awaiting-permission")
    return <ShieldQuestion className="size-3.5" aria-hidden="true" />;
  return <Bot className="size-3.5" aria-hidden="true" />;
}

export function AgentChip({
  state,
  onClick,
}: {
  state: AgentConnectionState;
  onClick?: (() => void) | undefined;
}) {
  const { t } = useTranslation();
  const label = t(`agentChip.state.${state}`);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-testid={testIds.agentChip.root}
      className={cn(
        "inline-flex h-8 items-center gap-xs rounded-lg border px-sm text-body-sm font-medium vellum-motion transition-colors",
        tones[state],
      )}
    >
      <span data-testid={testIds.agentChip.icon} className="flex items-center">
        <Icon state={state} />
      </span>
      <span data-testid={testIds.agentChip.label}>{label}</span>
    </button>
  );
}

import { useTranslation } from "react-i18next";
import { Check, CircleAlert, Loader2, PenLine } from "lucide-react";
import { StatusPill } from "@/components/common/StatusPill";
import { testIds } from "@/testids";
import type { SaveState } from "@/types/shell";

export function SaveStateBadge({ state }: { state: SaveState }) {
  const { t } = useTranslation();
  const map = {
    saved: { tone: "success", icon: <Check className="size-3.5" /> },
    unsaved: { tone: "neutral", icon: <PenLine className="size-3.5" /> },
    saving: { tone: "lagoon", icon: <Loader2 className="size-3.5 animate-spin" /> },
    error: { tone: "danger", icon: <CircleAlert className="size-3.5" /> },
  } as const;
  const config = map[state];

  return (
    <StatusPill tone={config.tone} icon={config.icon} data-testid={testIds.workspace.saveState}>
      {t(`workspace.save.${state}`)}
    </StatusPill>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlaskConical } from "lucide-react";
import { VellumButton } from "@/components/common/VellumButton";
import { testIds } from "@/testids";
import {
  agentFixtureKeys as AGENT_KEYS,
  documentFixtureKeys as DOC_KEYS,
  type AgentFixtureKey,
  type DocumentFixtureKey,
} from "@/fixtures";

interface StateSwitcherProps {
  documentKey: DocumentFixtureKey;
  agentKey: AgentFixtureKey;
  onChange: (next: { doc: DocumentFixtureKey; agent: AgentFixtureKey }) => void;
}

/** Dev-only fixture switcher; also readable from the ?doc= and ?agent= querystring. */
export function StateSwitcher({ documentKey, agentKey, onChange }: StateSwitcherProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div
      data-testid={testIds.dev.switcher}
      className="fixed bottom-md end-md z-50 flex flex-col items-end gap-sm"
    >
      {open ? (
        <div className="w-56 rounded-md border border-border bg-surface-raised p-md shadow-md">
          <p className="text-label-caps text-slate">{t("dev.title")}</p>
          <div className="mt-sm flex flex-col gap-xs">
            {DOC_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                data-testid={`${testIds.dev.option}.doc.${key}`}
                onClick={() => onChange({ doc: key, agent: agentKey })}
                className={`rounded-sm px-sm py-xs text-start text-body-sm ${documentKey === key ? "bg-lagoon-surface text-lagoon" : "text-slate hover:text-ink"}`}
              >
                {t(`fixtures.doc.${key}`)}
              </button>
            ))}
          </div>
          <div className="mt-sm flex flex-col gap-xs border-t border-border pt-sm">
            {AGENT_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                data-testid={`${testIds.dev.option}.agent.${key}`}
                onClick={() => onChange({ doc: documentKey, agent: key })}
                className={`rounded-sm px-sm py-xs text-start text-body-sm ${agentKey === key ? "bg-lagoon-surface text-lagoon" : "text-slate hover:text-ink"}`}
              >
                {t(`fixtures.agent.${key}`)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <VellumButton
        variant="secondary"
        size="icon"
        aria-expanded={open}
        aria-label={t(open ? "dev.close" : "dev.toggle")}
        data-testid={testIds.dev.toggle}
        onClick={() => setOpen((value) => !value)}
        className="shadow-md"
      >
        <FlaskConical className="size-4" aria-hidden="true" />
      </VellumButton>
    </div>
  );
}

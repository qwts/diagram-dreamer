import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bot, Loader2, SendHorizonal, X } from "lucide-react";
import { SessionTranscript } from "./SessionTranscript";
import { PermissionCard } from "./PermissionCard";
import { DiffPreviewCard } from "./DiffPreviewCard";
import { VellumButton } from "@/components/common/VellumButton";
import { testIds } from "@/testids";
import type { AgentSession, PermissionResolution } from "@/types/shell";

interface AgentPanelProps {
  session: AgentSession;
  onClose?: (() => void) | undefined;
  onConnect?: (() => void) | undefined;
  onSend?: ((message: string) => void) | undefined;
  onClearContext?: (() => void) | undefined;
  onResolvePermission?: ((id: string, resolution: PermissionResolution) => void) | undefined;
  onAcceptDiff?: ((id: string) => void) | undefined;
  onRejectDiff?: ((id: string) => void) | undefined;
}

export function AgentPanel({
  session,
  onClose,
  onConnect,
  onSend,
  onClearContext,
  onResolvePermission,
  onAcceptDiff,
  onRejectDiff,
}: AgentPanelProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // The permission card no longer steals focus when it arrives (SPEC §7.2,
  // "non-blocking"), so announce it politely instead.
  const pendingPermissionId = session.permission?.resolution ? undefined : session.permission?.id;
  const permissionTool = session.permission?.toolName;
  useEffect(() => {
    if (!pendingPermissionId) return;
    setAnnouncement(t("agent.permission.announce", { tool: permissionTool ?? "" }));
  }, [pendingPermissionId, permissionTool, t]);

  const resolveDiff = (id: string, status: "accepted" | "rejected") => {
    if (status === "accepted") onAcceptDiff?.(id);
    else onRejectDiff?.(id);
    setAnnouncement(t(`agent.diff.status.${status}`));
    promptRef.current?.focus();
  };

  return (
    <aside
      aria-label={t("agent.panel.label")}
      data-testid={testIds.agent.panel}
      className="flex h-full min-h-0 w-full flex-col border-s border-border bg-paper"
    >
      <header className="flex items-center justify-between gap-sm border-b border-border bg-surface-raised px-md py-sm">
        <span className="flex items-center gap-sm text-label-caps text-slate">
          <Bot className="size-4" aria-hidden="true" />
          {t("agent.panel.title")}
        </span>
        <VellumButton
          variant="ghost"
          size="icon"
          aria-label={t("agent.panel.close")}
          data-testid={testIds.agent.close}
          onClick={onClose}
        >
          <X className="size-4" aria-hidden="true" />
        </VellumButton>
      </header>

      {session.state === "disconnected" ? (
        <div
          data-testid={testIds.agent.disconnected}
          className="flex flex-1 flex-col items-center justify-center gap-sm p-lg text-center"
        >
          <Bot className="size-6 text-slate" aria-hidden="true" />
          <h2 className="text-h2 text-ink">{t("agent.disconnected.title")}</h2>
          <p className="max-w-xs text-body-sm text-slate">{t("agent.disconnected.body")}</p>
          <VellumButton variant="primary" data-testid={testIds.agent.connect} onClick={onConnect}>
            {t("agent.disconnected.action")}
          </VellumButton>
        </div>
      ) : (
        <>
          <div
            ref={transcriptRef}
            tabIndex={0}
            className="flex min-h-0 flex-1 flex-col gap-md overflow-auto p-md"
          >
            <SessionTranscript items={session.items} />

            {session.permission ? (
              <PermissionCard
                request={session.permission}
                onResolve={onResolvePermission}
                onDismissFocus={() => transcriptRef.current?.focus()}
              />
            ) : null}

            {session.diff ? (
              <DiffPreviewCard
                diff={session.diff}
                onAccept={(id) => resolveDiff(id, "accepted")}
                onReject={(id) => resolveDiff(id, "rejected")}
              />
            ) : null}

            <div
              data-testid={testIds.agent.liveRegion}
              aria-live="polite"
              aria-atomic="true"
              className="min-h-0"
            >
              {session.state === "streaming" ? (
                <p
                  data-testid={testIds.agent.streaming}
                  className="flex items-center gap-sm text-body-sm text-lagoon"
                >
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  {session.streamingText
                    ? t(session.streamingText)
                    : t("agent.transcript.streaming")}
                </p>
              ) : null}
              {announcement ? (
                <p data-testid={testIds.agent.announcement} className="text-body-sm text-slate">
                  {announcement}
                </p>
              ) : null}
            </div>
          </div>

          <form
            className="border-t border-border bg-surface-raised p-md"
            onSubmit={(event) => {
              event.preventDefault();
              onSend?.(message);
              setMessage("");
            }}
          >
            {session.contextBlockId ? (
              <div
                data-testid={testIds.agent.contextPill}
                className="mb-sm inline-flex items-center gap-xs rounded-lg border border-lagoon/40 bg-lagoon-surface px-sm py-xs text-body-sm text-lagoon"
              >
                <span className="font-mono">
                  {t("agent.prompt.context", { block: session.contextBlockId })}
                </span>
                <button
                  type="button"
                  aria-label={t("agent.prompt.contextRemove")}
                  data-testid={testIds.agent.contextPillRemove}
                  onClick={onClearContext}
                  className="inline-flex size-8 items-center justify-center rounded-sm vellum-motion transition-colors hover:text-ink"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : null}

            <div className="flex items-end gap-sm">
              <label className="sr-only" htmlFor="agent-prompt">
                {t("agent.prompt.label")}
              </label>
              <textarea
                id="agent-prompt"
                ref={promptRef}
                rows={2}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={t("agent.prompt.placeholder")}
                data-testid={testIds.agent.promptInput}
                className="min-h-10 flex-1 resize-none rounded-sm border border-border bg-paper p-sm text-body-sm text-ink placeholder:text-slate"
              />
              <VellumButton
                type="submit"
                variant="primary"
                size="icon"
                aria-label={t("agent.prompt.send")}
                data-testid={testIds.agent.promptSend}
              >
                <SendHorizonal className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              </VellumButton>
            </div>
          </form>
        </>
      )}
    </aside>
  );
}

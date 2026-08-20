import { useRef, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { ShieldQuestion, ShieldCheck, ShieldX } from "lucide-react";
import { VellumButton } from "@/components/common/VellumButton";
import { StatusPill } from "@/components/common/StatusPill";
import { testIds } from "@/testids";
import type { PermissionRequest, PermissionResolution } from "@/types/shell";

interface PermissionCardProps {
  request: PermissionRequest;
  onResolve?: ((id: string, resolution: PermissionResolution) => void) | undefined;
  onDismissFocus?: (() => void) | undefined;
}

/**
 * Inline, non-blocking, fully keyboard operable. Never a modal.
 *
 * Deliberately does NOT take focus when it appears. SPEC §7.2 calls for a
 * non-blocking approval surface, and a card that seizes focus mid-typing is
 * blocking in effect. Arrival is announced through the panel's polite live
 * region instead; the card is reachable by Tab and by F6 region cycling.
 */
export function PermissionCard({ request, onResolve, onDismissFocus }: PermissionCardProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const resolved = request.resolution;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onDismissFocus?.();
      return;
    }
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    const items = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    if (items.length === 0) return;
    const rtl = getComputedStyle(ref.current!).direction === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    let next = current;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else if (event.key === forward) next = current < 0 ? 0 : (current + 1) % items.length;
    else next = current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length;
    event.preventDefault();
    items[next]?.focus();
  };

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="group"
      aria-label={t("agent.permission.title")}
      data-testid={testIds.agent.permission}
      onKeyDown={onKeyDown}
      className="rounded-md border border-lagoon/40 bg-surface-raised p-md shadow-sm"
    >
      <div className="flex items-start gap-sm">
        <ShieldQuestion className="mt-2xs size-4 shrink-0 text-lagoon" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-body-md font-medium text-ink">{t("agent.permission.title")}</p>
          <p data-testid={testIds.agent.permissionTool} className="mt-xs font-mono text-body-sm text-ink">
            {t("agent.permission.tool", { tool: request.toolName })}
          </p>
          <p
            data-testid={testIds.agent.permissionTarget}
            className="mt-xs break-words font-mono text-body-sm text-slate"
          >
            {t("agent.permission.target", { target: request.targetSummary })}
          </p>

          {resolved ? (
            <div className="mt-sm" data-testid={testIds.agent.permissionResolved}>
              <StatusPill
                tone={resolved === "deny" ? "danger" : "success"}
                icon={
                  resolved === "deny" ? (
                    <ShieldX className="size-3.5" />
                  ) : (
                    <ShieldCheck className="size-3.5" />
                  )
                }
              >
                {t(`agent.permission.resolved.${resolved}`)}
              </StatusPill>
            </div>
          ) : (
            <div className="mt-md flex flex-wrap gap-sm">
              <VellumButton
                variant="primary"
                data-testid={testIds.agent.allowOnce}
                onClick={() => onResolve?.(request.id, "allowOnce")}
              >
                {t("agent.permission.allowOnce")}
              </VellumButton>
              <VellumButton
                data-testid={testIds.agent.alwaysSession}
                onClick={() => onResolve?.(request.id, "alwaysSession")}
              >
                {t("agent.permission.alwaysSession")}
              </VellumButton>
              <VellumButton
                variant="danger"
                data-testid={testIds.agent.deny}
                onClick={() => onResolve?.(request.id, "deny")}
              >
                {t("agent.permission.deny")}
              </VellumButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

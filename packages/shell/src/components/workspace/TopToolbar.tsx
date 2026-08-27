import { useTranslation } from "react-i18next";
import { Download, Moon, PanelRight, Save, Settings, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toolbar } from "@/components/common/Toolbar";
import { VellumButton } from "@/components/common/VellumButton";
import { SaveStateBadge } from "./SaveStateBadge";
import { AgentChip } from "@/components/agent/AgentChip";
import { useTheme } from "@/components/common/theme-context";
import { testIds } from "@/testids";
import type { AgentConnectionState, DocumentModel, ExportFormat } from "@/types/shell";

interface TopToolbarProps {
  document: DocumentModel;
  agentState: AgentConnectionState;
  onOpenSettings: () => void;
  onToggleAgentPanel: () => void;
  /**
   * One handler per format the workspace can actually deliver, or `undefined`
   * when nothing can be exported at all.
   *
   * A map rather than `(format) => void` because per-format availability is
   * real and has to be expressible: markdown comes straight from the document
   * text, while SVG and PNG need rendered output the preview sandbox has no way
   * to hand back yet. With a single callback the toolbar would have to guess,
   * and guessing is how three menu items ended up looking live while doing
   * nothing. The two absences also read differently to the user — see the
   * labels below.
   */
  onExport?: Partial<Record<ExportFormat, () => void>> | undefined;
  onSave?: (() => void) | undefined;
}

export function TopToolbar({
  document,
  agentState,
  onOpenSettings,
  onToggleAgentPanel,
  onExport,
  onSave,
}: TopToolbarProps) {
  const { t } = useTranslation();
  const { resolved, toggle } = useTheme();

  /**
   * Whether saving is possible *at all*, which is the host's answer, not the
   * document's.
   *
   * This takes precedence over `saveState` below. A host with no
   * `saveDocument` leaves the control permanently disabled, and a permanently
   * dead control that renames itself as the document changes — "No unsaved
   * changes", then "Save document", still dead — tells the reader nothing
   * about why it never works. The capability is the reason; the state is not.
   */
  const canSave = onSave !== undefined;

  /**
   * The menu, in order. Keys are spelled out rather than built from the format
   * name so every string in `en.json` is greppable from here — the audit's
   * dead-key scan cannot see through a template literal.
   */
  const exportFormats = [
    {
      format: "svg",
      testId: testIds.workspace.exportSvg,
      labelKey: "workspace.toolbar.exportSvg",
      unavailableKey: "workspace.toolbar.exportSvgUnavailable",
    },
    {
      format: "png",
      testId: testIds.workspace.exportPng,
      labelKey: "workspace.toolbar.exportPng",
      unavailableKey: "workspace.toolbar.exportPngUnavailable",
    },
    {
      format: "markdown",
      testId: testIds.workspace.exportMarkdown,
      labelKey: "workspace.toolbar.exportMarkdown",
      unavailableKey: "workspace.toolbar.exportMarkdownUnavailable",
    },
    // `satisfies` rather than an annotation: it checks each `format` against
    // the union while leaving the literal types intact, so `onExport[format]`
    // below narrows to the right member instead of the whole map.
  ] as const satisfies ReadonlyArray<{
    format: ExportFormat;
    testId: string;
    labelKey: string;
    unavailableKey: string;
  }>;

  return (
    <header className="flex flex-wrap items-center justify-between gap-sm border-b border-border bg-surface-raised px-md py-sm">
      <div className="flex min-w-0 items-center gap-sm">
        <span
          data-testid={testIds.workspace.fileName}
          className="truncate text-body-md font-medium text-ink"
        >
          {document.fileName}
        </span>
        <SaveStateBadge state={document.saveState} />
      </div>

      <Toolbar label={t("workspace.toolbar.label")} data-testid={testIds.workspace.toolbar}>
        {/*
         * SPEC §8 lists "Open/save/watch local files". `SaveStateBadge` next to
         * the filename reports the state; this is the way to act on it.
         *
         * The label changes with the state rather than the button vanishing —
         * a control that disappears when there is nothing to do is a control
         * users stop looking for. The same reasoning covers a host that cannot
         * save at all: disabled and explained, never hidden, so the toolbar
         * has the same shape under every host and the Toolbar's roving focus
         * (which skips `[disabled]`) lands on the same controls in the same
         * order wherever Vellum is running.
         */}
        <VellumButton
          variant="ghost"
          size="icon"
          aria-label={t(
            !canSave
              ? "workspace.toolbar.saveUnsupported"
              : document.saveState === "error"
                ? "workspace.toolbar.saveRetry"
                : document.saveState === "saved"
                  ? "workspace.toolbar.saveNothing"
                  : "workspace.toolbar.save",
          )}
          data-testid={testIds.workspace.save}
          disabled={!canSave || document.saveState === "saved" || document.saveState === "saving"}
          onClick={onSave}
        >
          <Save className="size-4" aria-hidden="true" />
        </VellumButton>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/*
             * The disabled label keeps "Export" as its opening words. The
             * button's accessible name is otherwise its visible text, and WCAG
             * 2.5.3 wants the visible label to remain part of the name — so the
             * reason is appended, the way `zoomFitPending` appends to "Fit to
             * frame", rather than replacing it.
             */}
            <VellumButton
              data-testid={testIds.workspace.exportMenu}
              disabled={onExport === undefined}
              {...(onExport === undefined && {
                "aria-label": t("workspace.toolbar.exportUnsupported"),
              })}
            >
              <Download className="size-4" aria-hidden="true" />
              {t("workspace.toolbar.export")}
            </VellumButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {exportFormats.map(({ format, testId, labelKey, unavailableKey }) => {
              const handler = onExport?.[format];
              return (
                <DropdownMenuItem
                  key={format}
                  data-testid={testId}
                  disabled={handler === undefined}
                  // Reachable only once the menu has opened, so the host can
                  // export *something*: an item without a handler is a format
                  // the workspace cannot produce yet, which is a different
                  // sentence from the trigger's and says so.
                  {...(handler === undefined && { "aria-label": t(unavailableKey) })}
                  {...(handler && { onSelect: handler })}
                >
                  {t(labelKey)}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <VellumButton
          variant="ghost"
          size="icon"
          aria-label={t(
            resolved === "dark" ? "workspace.toolbar.themeDark" : "workspace.toolbar.themeLight",
          )}
          data-testid={testIds.workspace.themeToggle}
          onClick={toggle}
        >
          {resolved === "dark" ? (
            <Sun className="size-4" aria-hidden="true" />
          ) : (
            <Moon className="size-4" aria-hidden="true" />
          )}
        </VellumButton>

        <VellumButton
          variant="ghost"
          size="icon"
          aria-label={t("workspace.toolbar.agentPanel")}
          data-testid={testIds.workspace.agentPanelToggle}
          onClick={onToggleAgentPanel}
        >
          <PanelRight className="size-4" aria-hidden="true" />
        </VellumButton>

        <VellumButton
          variant="ghost"
          size="icon"
          aria-label={t("workspace.toolbar.settings")}
          data-testid={testIds.workspace.settings}
          onClick={onOpenSettings}
        >
          <Settings className="size-4" aria-hidden="true" />
        </VellumButton>

        <AgentChip state={agentState} onClick={onToggleAgentPanel} />
      </Toolbar>
    </header>
  );
}

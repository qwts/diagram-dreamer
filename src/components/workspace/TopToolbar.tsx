import { useTranslation } from "react-i18next";
import { Download, Moon, PanelRight, Settings, Sun } from "lucide-react";
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
import type { AgentConnectionState, DocumentModel } from "@/types/shell";

interface TopToolbarProps {
  document: DocumentModel;
  agentState: AgentConnectionState;
  onOpenSettings: () => void;
  onToggleAgentPanel: () => void;
  onExport?: ((format: "svg" | "png" | "markdown") => void) | undefined;
}

export function TopToolbar({
  document,
  agentState,
  onOpenSettings,
  onToggleAgentPanel,
  onExport,
}: TopToolbarProps) {
  const { t } = useTranslation();
  const { resolved, toggle } = useTheme();

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <VellumButton data-testid={testIds.workspace.exportMenu}>
              <Download className="size-4" aria-hidden="true" />
              {t("workspace.toolbar.export")}
            </VellumButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              data-testid={testIds.workspace.exportSvg}
              onSelect={() => onExport?.("svg")}
            >
              {t("workspace.toolbar.exportSvg")}
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid={testIds.workspace.exportPng}
              onSelect={() => onExport?.("png")}
            >
              {t("workspace.toolbar.exportPng")}
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid={testIds.workspace.exportMarkdown}
              onSelect={() => onExport?.("markdown")}
            >
              {t("workspace.toolbar.exportMarkdown")}
            </DropdownMenuItem>
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

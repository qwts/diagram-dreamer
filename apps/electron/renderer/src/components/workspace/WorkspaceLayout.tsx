import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { TopToolbar } from "./TopToolbar";
import { StatusBar } from "./StatusBar";
import { SettingsDialog } from "./SettingsDialog";
import { EditorHost } from "@/components/editor/EditorHost";
import { PreviewPane } from "@/components/preview/PreviewPane";
import { AgentPanel } from "@/components/agent/AgentPanel";
import { testIds } from "@/testids";
import type { AgentSession, DocumentModel, PermissionResolution } from "@/types/shell";

interface WorkspaceLayoutProps {
  document: DocumentModel;
  session: AgentSession;
  onAskAgent?: ((blockId: string) => void) | undefined;
  onClearContext?: (() => void) | undefined;
  onResolvePermission?: ((id: string, resolution: PermissionResolution) => void) | undefined;
  onAcceptDiff?: ((id: string) => void) | undefined;
  onRejectDiff?: ((id: string) => void) | undefined;
  onConnectAgent?: (() => void) | undefined;
}

export function WorkspaceLayout({
  document: doc,
  session,
  onAskAgent,
  onClearContext,
  onResolvePermission,
  onAcceptDiff,
  onRejectDiff,
  onConnectAgent,
}: WorkspaceLayoutProps) {
  const { t, i18n } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(true);
  const [mermaidVersion, setMermaidVersion] = useState(doc.mermaidVersion);
  const rootRef = useRef<HTMLDivElement>(null);

  /** F6 / Shift+F6 cycles the major regions: editor → preview → agent → status. */
  const cycleRegions = useCallback((backwards: boolean) => {
    const order = [
      testIds.editor.scrollContainer,
      testIds.preview.root,
      testIds.agent.panel,
      testIds.workspace.statusBar,
    ];
    const nodes = order
      .map((id) => rootRef.current?.querySelector<HTMLElement>(`[data-testid="${id}"]`))
      .filter((node): node is HTMLElement => Boolean(node));
    if (nodes.length === 0) return;
    const active = window.document.activeElement as HTMLElement | null;
    const currentIndex = nodes.findIndex((node) => node === active || node.contains(active));
    const next =
      currentIndex < 0 ? 0 : (currentIndex + (backwards ? -1 : 1) + nodes.length) % nodes.length;
    const target = nodes[next]!;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "F6") return;
      event.preventDefault();
      cycleRegions(event.shiftKey);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cycleRegions]);

  return (
    <div
      ref={rootRef}
      data-testid={testIds.workspace.root}
      className="flex h-screen min-h-0 flex-col bg-paper"
    >
      <TopToolbar
        document={doc}
        agentState={session.state}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleAgentPanel={() => setAgentOpen((value) => !value)}
      />

      <main
        data-testid={testIds.workspace.main}
        aria-label={t("workspace.region.main")}
        className="flex min-h-0 flex-1"
      >
        <ResizablePanelGroup
          key={agentOpen ? "with-agent" : "no-agent"}
          data-testid={testIds.workspace.splitPane}
          className="min-h-0 flex-1"
        >
          <ResizablePanel defaultSize={agentOpen ? "38" : "45"} minSize="20">
            <EditorHost document={doc} />
          </ResizablePanel>
          <ResizableHandle
            withHandle
            aria-label={t("workspace.splitter.label")}
            data-testid={testIds.workspace.resizeHandle}
          />
          <ResizablePanel defaultSize={agentOpen ? "37" : "55"} minSize="25">
            <PreviewPane blocks={doc.blocks} theme={doc.theme} onAskAgent={onAskAgent} />
          </ResizablePanel>

          {agentOpen ? (
            <>
              <ResizableHandle withHandle aria-label={t("agent.panel.label")} />
              <ResizablePanel defaultSize="25" minSize="18" maxSize="45">
                <AgentPanel
                  session={session}
                  onClose={() => setAgentOpen(false)}
                  onConnect={onConnectAgent}
                  onClearContext={onClearContext}
                  onResolvePermission={onResolvePermission}
                  onAcceptDiff={onAcceptDiff}
                  onRejectDiff={onRejectDiff}
                />
              </ResizablePanel>
            </>
          ) : null}
        </ResizablePanelGroup>
      </main>

      <StatusBar document={{ ...doc, mermaidVersion }} />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        mermaidVersion={mermaidVersion}
        onMermaidVersionChange={setMermaidVersion}
        language={i18n.language}
        onLanguageChange={(next) => void i18n.changeLanguage(next)}
      />
    </div>
  );
}

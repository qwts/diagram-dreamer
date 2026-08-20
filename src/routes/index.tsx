import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { StateSwitcher } from "@/components/dev/StateSwitcher";
import {
  agentFixtures,
  documentFixtures,
  type AgentFixtureKey,
  type DocumentFixtureKey,
} from "@/fixtures";
import type { AgentSession, PermissionResolution } from "@/types/shell";

const searchSchema = z.object({
  doc: z.enum(["empty", "multi", "failed"]).optional(),
  agent: z.enum(["disconnected", "idle", "streaming", "permission", "diff"]).optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Vellum — Mermaid Document Workspace" },
      {
        name: "description",
        content:
          "Edit markdown with Mermaid blocks on the left, review rendered diagrams on the right, and work alongside a local agent.",
      },
      { property: "og:title", content: "Vellum — Mermaid Document Workspace" },
      {
        property: "og:description",
        content:
          "A drafting-table workspace for markdown documents with Mermaid diagrams and agentic editing.",
      },
    ],
  }),
  component: WorkspacePage,
});

function WorkspacePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const documentKey: DocumentFixtureKey = search.doc ?? "multi";
  const agentKey: AgentFixtureKey = search.agent ?? "streaming";

  const [session, setSession] = useState<AgentSession | null>(null);
  const activeSession = session ?? agentFixtures[agentKey];

  const resolvePermission = (id: string, resolution: PermissionResolution) =>
    setSession((current) => {
      const base = current ?? agentFixtures[agentKey];
      if (!base.permission || base.permission.id !== id) return base;
      return { ...base, state: "idle", permission: { ...base.permission, resolution } };
    });

  const setDiffStatus = (status: "accepted" | "rejected") =>
    setSession((current) => {
      const base = current ?? agentFixtures[agentKey];
      return base.diff ? { ...base, diff: { ...base.diff, status } } : base;
    });

  return (
    <>
      <WorkspaceLayout
        document={documentFixtures[documentKey]}
        session={activeSession}
        onAskAgent={(blockId) =>
          setSession({ ...activeSession, contextBlockId: blockId })
        }
        onClearContext={() => {
          const { contextBlockId: _omit, ...rest } = activeSession;
          setSession(rest);
        }}
        onResolvePermission={resolvePermission}
        onAcceptDiff={() => setDiffStatus("accepted")}
        onRejectDiff={() => setDiffStatus("rejected")}
        onConnectAgent={() => setSession(agentFixtures.idle)}
      />
      {import.meta.env.DEV ? (
        <StateSwitcher
          documentKey={documentKey}
          agentKey={agentKey}
          onChange={({ doc, agent }) => {
            setSession(null);
            void navigate({ search: { doc, agent } });
          }}
        />
      ) : null}
    </>
  );
}

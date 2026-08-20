import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { StateSwitcher } from "@/components/dev/StateSwitcher";
import {
  agentFixtures,
  documentFixtures,
  parseFixtureState,
  type AgentFixtureKey,
  type DocumentFixtureKey,
} from "@/fixtures";
import type { AgentSession, PermissionResolution } from "@/types/shell";

const DOC_KEYS = ["empty", "multi", "failed"] as const;
const AGENT_KEYS = ["disconnected", "idle", "streaming", "permission", "diff"] as const;

interface WorkspaceSearch {
  doc?: DocumentFixtureKey;
  agent?: AgentFixtureKey;
}

/**
 * Fixture selection. `?state=<doc>-<agent>` is the flat form the test gates
 * iterate; `?doc=` / `?agent=` address the two axes independently. `state`
 * wins when both are supplied.
 */
const validateSearch = (search: Record<string, unknown>): WorkspaceSearch => {
  const fromState = parseFixtureState(search["state"]);
  const doc = fromState?.doc ?? DOC_KEYS.find((key) => key === search["doc"]);
  const agent = fromState?.agent ?? AGENT_KEYS.find((key) => key === search["agent"]);
  return { ...(doc && { doc }), ...(agent && { agent }) };
};

export const Route = createFileRoute("/")({
  validateSearch,
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
        onAskAgent={(blockId) => setSession({ ...activeSession, contextBlockId: blockId })}
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

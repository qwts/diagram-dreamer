import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { parseDocument, toDocumentModel } from "@vellum/core";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { StateSwitcher } from "@/components/dev/StateSwitcher";
import {
  agentFixtureKeys,
  agentFixtures,
  documentFixtureKeys,
  documentFixtures,
  parseFixtureState,
  type AgentFixtureKey,
  type DocumentFixtureKey,
} from "@/fixtures";
import type { AgentSession, DocumentModel, PermissionResolution } from "@/types/shell";

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
  const doc = fromState?.doc ?? documentFixtureKeys.find((key) => key === search["doc"]);
  const agent = fromState?.agent ?? agentFixtureKeys.find((key) => key === search["agent"]);
  return { ...(doc && { doc }), ...(agent && { agent }) };
};

export const Route = createFileRoute("/")({
  validateSearch,
  component: WorkspacePage,
});

/**
 * How long the source has to stop changing before the preview re-renders.
 *
 * Long enough that a diagram is not repeatedly rebuilt from half-typed syntax
 * — every one of those intermediate states is a parse error, so an undebounced
 * preview spends most of a sentence showing a diagnostic card for text the
 * author is still writing. Short enough to still read as live.
 */
const SETTLE_MS = 300;

interface Cursor {
  line: number;
  column: number;
}

/** Edits, tagged with the fixture they belong to so switching documents drops them. */
interface Draft {
  key: DocumentFixtureKey;
  text: string;
}

function WorkspacePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const documentKey: DocumentFixtureKey = search.doc ?? "multi";
  const agentKey: AgentFixtureKey = search.agent ?? "streaming";

  const [session, setSession] = useState<AgentSession | null>(null);
  const activeSession = session ?? agentFixtures[agentKey];

  const fixture = documentFixtures[documentKey];
  const [draft, setDraft] = useState<Draft | null>(null);
  const [settled, setSettled] = useState<Draft | null>(null);
  const [cursor, setCursor] = useState<(Cursor & { key: DocumentFixtureKey }) | null>(null);

  // Tagging by fixture key instead of clearing in an effect: an effect would
  // render the new document once with the old document's edits still applied.
  const settledText = settled?.key === documentKey ? settled.text : null;
  const liveCursor = cursor?.key === documentKey ? cursor : null;

  useEffect(() => {
    if (!draft || draft.key !== documentKey) return;
    const timer = setTimeout(() => {
      setSettled(draft);
    }, SETTLE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [draft, documentKey]);

  /**
   * Untouched documents stay exactly as the fixture declares them, so every
   * `?state=` gate still describes the state it is named after. Once edited,
   * the model is whatever the parser makes of the text — including its
   * diagnostics, since the fixture's were pinned to lines that have moved.
   */
  const document: DocumentModel = useMemo(() => {
    const base =
      settledText === null
        ? fixture
        : toDocumentModel(
            {
              id: fixture.id,
              fileName: fixture.fileName,
              filePath: fixture.filePath,
              saveState: "unsaved",
            },
            parseDocument(settledText),
          );
    return liveCursor
      ? { ...base, cursor: { line: liveCursor.line, column: liveCursor.column } }
      : base;
  }, [fixture, settledText, liveCursor]);

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
        document={document}
        session={activeSession}
        onEdit={(text) => setDraft({ key: documentKey, text })}
        onCursorChange={(next) => setCursor({ key: documentKey, ...next })}
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

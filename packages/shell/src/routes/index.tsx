import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { documentText, parseDocument, toDocumentModel } from "@vellum/core";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { StateSwitcher } from "@/components/dev/StateSwitcher";
import { useHostCapabilities } from "@/host/capabilities-context";
import {
  agentFixtureKeys,
  agentFixtures,
  documentFixtureKeys,
  documentFixtures,
  parseFixtureState,
  type AgentFixtureKey,
  type DocumentFixtureKey,
} from "@/fixtures";
import type {
  AgentSession,
  Diagnostic,
  DocumentModel,
  ExportFormat,
  PermissionResolution,
  SaveState,
} from "@/types/shell";

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

/** What the sandbox reported about one block, keyed by that block's id. */
type RenderFailures = ReadonlyMap<string, { message: string; line: number }>;

function WorkspacePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const documentKey: DocumentFixtureKey = search.doc ?? "multi";
  const agentKey: AgentFixtureKey = search.agent ?? "streaming";

  /**
   * What this host can do. Read here, at the route, because this is where the
   * handlers the workspace needs are assembled — the same place `onAcceptDiff`
   * and `onResolvePermission` are built. Components below stay props-driven
   * (CLAUDE.md invariant 1) and no component asks *which* host it is in.
   */
  const { saveDocument, exportArtifact } = useHostCapabilities();

  const [session, setSession] = useState<AgentSession | null>(null);
  const activeSession = session ?? agentFixtures[agentKey];

  const fixture = documentFixtures[documentKey];
  const [draft, setDraft] = useState<Draft | null>(null);
  const [settled, setSettled] = useState<Draft | null>(null);
  const [cursor, setCursor] = useState<(Cursor & { key: DocumentFixtureKey }) | null>(null);

  /**
   * How the last save attempt ended, tagged by document like the draft above.
   *
   * The host reports success or failure and nothing else; turning that into
   * the state the badge and the Save control read is this route's job, in the
   * same way it turns an accepted diff into session state.
   */
  const [saveResult, setSaveResult] = useState<{
    key: DocumentFixtureKey;
    state: SaveState;
  } | null>(null);

  // Tagging by fixture key instead of clearing in an effect: an effect would
  // render the new document once with the old document's edits still applied.
  const settledText = settled?.key === documentKey ? settled.text : null;
  const draftText = draft?.key === documentKey ? draft.text : null;
  const liveCursor = cursor?.key === documentKey ? cursor : null;
  const liveSaveState = saveResult?.key === documentKey ? saveResult.state : null;

  const [failures, setFailures] = useState<RenderFailures>(new Map());

  /**
   * Only Mermaid knows a block is broken, and it only finds out at render
   * time. Collecting what it reports here is what lets the gutter and the
   * status bar agree with the preview instead of calling a red document clean.
   *
   * Identity-stable, and returns the same map when nothing changed: the
   * findings feed back into the model that produced the render, so a callback
   * that churned would loop.
   */
  const reportRenderDiagnostic = useCallback(
    (blockId: string, failure: { message: string; line: number } | null) => {
      setFailures((current) => {
        const existing = current.get(blockId);
        if (!failure) {
          if (!existing) return current;
          const next = new Map(current);
          next.delete(blockId);
          return next;
        }
        if (existing?.message === failure.message && existing.line === failure.line) return current;
        return new Map(current).set(blockId, failure);
      });
    },
    [],
  );

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
    // Blocks the document no longer contains drop out here rather than being
    // pruned on unmount: a block's id is its content hash, so an edited block
    // is a different block and its old finding is about text that is gone.
    const live: Diagnostic[] = base.blocks.flatMap((block) => {
      const failure = failures.get(block.id);
      return failure
        ? [
            {
              id: `render-${block.id}`,
              severity: "error" as const,
              messageKey: "preview.error.mermaid",
              messageValues: { message: failure.message },
              line: failure.line,
            },
          ]
        : [];
    });

    const withFindings =
      live.length === 0
        ? base
        : {
            ...base,
            diagnostics: [...base.diagnostics, ...live].sort((a, b) => a.line - b.line),
          };

    const withCursor = liveCursor
      ? { ...withFindings, cursor: { line: liveCursor.line, column: liveCursor.column } }
      : withFindings;

    // Applied last: a save that has actually happened outranks both the
    // fixture's declared state and the "unsaved" an edit implies.
    return liveSaveState === null ? withCursor : { ...withCursor, saveState: liveSaveState };
  }, [fixture, settledText, liveCursor, liveSaveState, failures]);

  /**
   * The text a save or an export should carry: the draft if there is one, and
   * the model's text otherwise.
   *
   * Draft first, deliberately. `settled` lags the editor by `SETTLE_MS` so the
   * preview is not rebuilt from half-typed syntax, but that debounce is about
   * *rendering* — saving the settled text would silently drop whatever was
   * typed in the last third of a second, and a save that quietly loses
   * keystrokes is worse than no save at all. An untouched document has no
   * draft and falls through to the model, which is the fixture's own text.
   */
  const currentText = draftText ?? documentText(document);
  const { fileName } = document;

  /**
   * Save, when the host can. `undefined` when it cannot, which is what the
   * toolbar reads to disable the control and say why — the alternative, a
   * handler that resolves immediately, would leave the button looking live
   * while doing nothing, which is the defect this route is fixing.
   */
  const onSave = useMemo(() => {
    if (!saveDocument) return undefined;
    return () => {
      setSaveResult({ key: documentKey, state: "saving" });
      // Two callbacks rather than `.catch`: the outcome is tagged with the
      // document that was saved, so switching documents mid-write cannot land
      // one file's result on another's badge.
      void saveDocument(currentText).then(
        () => setSaveResult({ key: documentKey, state: "saved" }),
        () => setSaveResult({ key: documentKey, state: "error" }),
      );
    };
  }, [saveDocument, currentText, documentKey]);

  /**
   * Export, one entry per format the workspace can actually produce.
   *
   * Markdown is the whole document, which this route already holds. SVG and
   * PNG are missing on purpose and not for want of a host: the diagram is
   * rendered by a sandboxed iframe at an opaque origin, and the sandbox
   * protocol (`packages/core/src/render/protocol.ts`) reports only a size back
   * — there is no path by which rendered markup could reach here. Offering
   * them would be the same lie in a new place, so they stay disabled with a
   * reason until the protocol can return the markup.
   */
  const onExport = useMemo((): Partial<Record<ExportFormat, () => void>> | undefined => {
    if (!exportArtifact) return undefined;
    return {
      markdown: () => {
        // The rejection path has no user-facing surface yet, and this catch is
        // here so an unlikely failure cannot surface instead as an unhandled
        // rejection in the console — which the render gate treats as failure.
        void exportArtifact({
          format: "markdown",
          suggestedFileName: fileName,
          contents: currentText,
        }).catch(() => {});
      },
    };
  }, [exportArtifact, currentText, fileName]);

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
        onSave={onSave}
        onExport={onExport}
        onEdit={(text) => {
          setDraft({ key: documentKey, text });
          // A keystroke makes any earlier outcome stale — the document is
          // unsaved again, whatever the last write reported.
          setSaveResult(null);
        }}
        onCursorChange={(next) => setCursor({ key: documentKey, ...next })}
        onRenderDiagnostic={reportRenderDiagnostic}
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

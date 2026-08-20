import type { AgentSession, DocumentModel, DocumentTemplate, RecentFile } from "@/types/shell";

const source = [
  "# Deployment architecture",
  "",
  "The renderer talks to the agent through a transport seam.",
  "",
  "```mermaid",
  "flowchart LR",
  "  R[Renderer UI shell] --> C[core]",
  "  R --> A[acp-client]",
  "  A --> M[Main process]",
  "```",
  "",
  "## Session handshake",
  "",
  "```mermaid",
  "sequenceDiagram",
  "  Renderer->>Main: session/new",
  "  Main->>Agent: initialize",
  "  Agent-->>Renderer: session/update",
  "```",
  "",
  "## Document lifecycle",
  "",
  "```mermaid",
  "stateDiagram-v2",
  "  [*] --> Draft",
  "  Draft --> Rendering",
  "  Rendering --> Ready",
  "```",
];

/**
 * A block's Mermaid source, sliced out of the document rather than restated.
 *
 * `startLine`/`endLine` are the fence lines themselves and are 1-based, so the
 * body is everything between them. Deriving it means the editor pane and the
 * rendered diagram cannot disagree — a fixture whose preview text said one
 * thing while its diagram drew another would make every render test a lie.
 */
function blockSource(startLine: number, endLine: number, lines: string[] = source): string {
  return lines.slice(startLine, endLine - 1).join("\n");
}

export const emptyDocument: DocumentModel = {
  id: "doc-empty",
  fileName: "untitled.md",
  filePath: "~/documents/untitled.md",
  saveState: "saved",
  lineCount: 3,
  sourcePreview: ["# Untitled", "", ""],
  blocks: [],
  diagnostics: [],
  cursor: { line: 1, column: 1 },
  // Matches the Mermaid actually bundled with the sandbox. Once a real
  // document model exists this comes from the sandbox handshake, which
  // reports its own version, rather than from a fixture literal.
  mermaidVersion: "11.17.0",
};

export const multiBlockDocument: DocumentModel = {
  id: "doc-multi",
  fileName: "architecture.md",
  filePath: "~/projects/vellum/docs/architecture.md",
  saveState: "unsaved",
  lineCount: source.length,
  sourcePreview: source,
  blocks: [
    {
      id: "block-1",
      diagramType: "flowchart",
      startLine: 5,
      endLine: 10,
      state: "ready",
      source: blockSource(5, 10),
    },
    {
      id: "block-2",
      diagramType: "sequenceDiagram",
      startLine: 14,
      endLine: 19,
      state: "ready",
      source: blockSource(14, 19),
    },
    {
      id: "block-3",
      diagramType: "stateDiagram-v2",
      startLine: 23,
      endLine: 28,
      state: "ready",
      source: blockSource(23, 28),
    },
  ],
  diagnostics: [],
  cursor: { line: 6, column: 12 },
  // Matches the Mermaid actually bundled with the sandbox. Once a real
  // document model exists this comes from the sandbox handshake, which
  // reports its own version, rather than from a fixture literal.
  mermaidVersion: "11.17.0",
};

export const failedBlockDocument: DocumentModel = {
  ...multiBlockDocument,
  id: "doc-failed",
  saveState: "error",
  blocks: [
    multiBlockDocument.blocks[0]!,
    {
      ...multiBlockDocument.blocks[1]!,
      state: "error",
      diagnostic: {
        id: "diag-1",
        severity: "error",
        messageKey: "preview.diagnostic.parse",
        messageValues: { token: "-->>" },
        line: 16,
      },
    },
    {
      ...multiBlockDocument.blocks[2]!,
      state: "error",
      diagnostic: {
        id: "diag-2",
        severity: "warning",
        messageKey: "preview.diagnostic.lintLongLabel",
        line: 7,
      },
    },
  ],
  diagnostics: [
    {
      id: "diag-1",
      severity: "error",
      messageKey: "preview.diagnostic.parse",
      messageValues: { token: "-->>" },
      line: 16,
    },
    {
      id: "diag-2",
      severity: "warning",
      messageKey: "preview.diagnostic.lintLongLabel",
      line: 7,
    },
  ],
};

/**
 * Warnings but no errors. Exercises the branch where diagnostics exist yet
 * nothing is severity "error" — the status bar must use warning tokens, never
 * danger ones (invariant 3). Added after a PR review found that branch
 * uncovered: `failed` carries one error and one warning, so it could not
 * distinguish the two.
 */
export const warnedDocument: DocumentModel = {
  ...multiBlockDocument,
  id: "doc-warned",
  saveState: "saved",
  blocks: [
    multiBlockDocument.blocks[0]!,
    multiBlockDocument.blocks[1]!,
    {
      ...multiBlockDocument.blocks[2]!,
      state: "error",
      diagnostic: {
        id: "diag-w1",
        severity: "warning",
        messageKey: "preview.diagnostic.lintLongLabel",
        line: 7,
      },
    },
  ],
  diagnostics: [
    {
      id: "diag-w1",
      severity: "warning",
      messageKey: "preview.diagnostic.lintLongLabel",
      line: 7,
    },
  ],
};

const baseItems: AgentSession["items"] = [
  { kind: "text", id: "item-1", bodyKey: "agent.message.greeting" },
];

export const agentDisconnected: AgentSession = {
  state: "disconnected",
  agentName: "Claude Code",
  items: [],
};

export const agentIdle: AgentSession = {
  state: "idle",
  agentName: "Claude Code",
  items: baseItems,
};

export const agentStreaming: AgentSession = {
  state: "streaming",
  agentName: "Claude Code",
  contextBlockId: "block-1",
  items: [
    ...baseItems,
    { kind: "text", id: "item-2", bodyKey: "agent.message.planIntro" },
    {
      kind: "plan",
      id: "item-3",
      steps: [
        { id: "s1", labelKey: "agent.step.readDoc", status: "done" },
        { id: "s2", labelKey: "agent.step.locateBlock", status: "done" },
        { id: "s3", labelKey: "agent.step.rewrite", status: "active" },
        { id: "s4", labelKey: "agent.step.verify", status: "pending" },
      ],
    },
    {
      kind: "toolCall",
      id: "item-4",
      toolName: "fs/read",
      target: "docs/architecture.md",
      status: "success",
    },
    {
      kind: "toolCall",
      id: "item-5",
      toolName: "fs/write",
      target: "docs/architecture.md#block-1",
      status: "running",
    },
  ],
  streamingText: "agent.message.streaming",
};

const { streamingText: _streamingText, ...streamingBase } = agentStreaming;

export const agentPermissionPending: AgentSession = {
  ...streamingBase,
  state: "awaiting-permission",
  items: [
    ...agentStreaming.items.slice(0, 4),
    {
      kind: "toolCall",
      id: "item-5",
      toolName: "fs/write",
      target: "docs/architecture.md#block-1",
      status: "pending",
    },
  ],
  permission: {
    id: "perm-1",
    toolName: "fs/write",
    targetSummary: "docs/architecture.md — replace lines 5-10",
  },
};

export const agentDiffPending: AgentSession = {
  ...streamingBase,
  state: "idle",
  diff: {
    id: "diff-1",
    titleKey: "agent.diff.title",
    filePath: "docs/architecture.md",
    before: [
      "flowchart LR",
      "  R[Renderer UI shell] --> C[core]",
      "  R --> A[acp-client]",
      "  A --> M[Main process]",
    ],
    after: [
      "flowchart LR",
      "  R[Renderer UI shell] --> C[packages/core]",
      "  R --> A[packages/acp-client]",
      "  A -- transport --> M[Main process]",
      "  M -- stdio JSON-RPC --> AG[Agent]",
    ],
    status: "pending",
  },
};

/**
 * The settled counterparts. Both cards outlive the decision they were asking
 * for — `PermissionRequest.resolution` and `DiffPreview.status` turn them into
 * records of what happened — but until these existed nothing rendered that
 * branch, so the resolved layout went unasserted and its Lagoon violation went
 * unseen. A state a type permits needs a fixture.
 */
export const agentPermissionResolved: AgentSession = {
  ...agentPermissionPending,
  state: "idle",
  items: [
    ...agentPermissionPending.items.slice(0, 4),
    {
      kind: "toolCall",
      id: "item-5",
      toolName: "fs/write",
      target: "docs/architecture.md#block-1",
      status: "success",
    },
  ],
  permission: {
    ...agentPermissionPending.permission!,
    resolution: "allowOnce",
  },
};

export const agentDiffSettled: AgentSession = {
  ...agentDiffPending,
  diff: { ...agentDiffPending.diff!, status: "accepted" },
};

export const recentFiles: RecentFile[] = [
  {
    id: "r1",
    fileName: "architecture.md",
    filePath: "~/projects/vellum/docs/architecture.md",
    openedAtKey: "welcome.recent.openedAt.today",
  },
  {
    id: "r2",
    fileName: "acp-sequences.md",
    filePath: "~/projects/vellum/docs/acp-sequences.md",
    openedAtKey: "welcome.recent.openedAt.yesterday",
  },
  {
    id: "r3",
    fileName: "release-plan.md",
    filePath: "~/notes/release-plan.md",
    openedAtKey: "welcome.recent.openedAt.lastWeek",
  },
];

export const templates: DocumentTemplate[] = [
  {
    id: "t1",
    nameKey: "welcome.templates.flowchart.name",
    descriptionKey: "welcome.templates.flowchart.description",
    diagramType: "flowchart",
  },
  {
    id: "t2",
    nameKey: "welcome.templates.sequence.name",
    descriptionKey: "welcome.templates.sequence.description",
    diagramType: "sequenceDiagram",
  },
  {
    id: "t3",
    nameKey: "welcome.templates.state.name",
    descriptionKey: "welcome.templates.state.description",
    diagramType: "stateDiagram-v2",
  },
  {
    id: "t4",
    nameKey: "welcome.templates.er.name",
    descriptionKey: "welcome.templates.er.description",
    diagramType: "erDiagram",
  },
  {
    id: "t5",
    nameKey: "welcome.templates.class.name",
    descriptionKey: "welcome.templates.class.description",
    diagramType: "classDiagram",
  },
  {
    id: "t6",
    nameKey: "welcome.templates.gantt.name",
    descriptionKey: "welcome.templates.gantt.description",
    diagramType: "gantt",
  },
];

/**
 * Syntactically invalid Mermaid in an otherwise healthy document.
 *
 * The point is the *disagreement*: every block is `state: "ready"` and the
 * model carries no diagnostic, because nothing has tried to render yet. Only
 * Mermaid knows block-2 is broken, and it only finds out at render time. That
 * is the branch SPEC §6 describes — "the renderer never white-screens on a bad
 * block" — and no fixture reached it before, because `failed` hands the shell a
 * diagnostic that was decided for it.
 */
const brokenSource = source.map((line, index) =>
  index === 15 ? "  Renderer ->< Main: not an arrow" : line,
);

export const brokenDocument: DocumentModel = {
  ...multiBlockDocument,
  id: "doc-broken",
  fileName: "broken.md",
  sourcePreview: brokenSource,
  blocks: [
    multiBlockDocument.blocks[0]!,
    { ...multiBlockDocument.blocks[1]!, source: blockSource(14, 19, brokenSource) },
    multiBlockDocument.blocks[2]!,
  ],
};

export const documentFixtures = {
  empty: emptyDocument,
  multi: multiBlockDocument,
  failed: failedBlockDocument,
  warned: warnedDocument,
  broken: brokenDocument,
} as const;

export const agentFixtures = {
  disconnected: agentDisconnected,
  idle: agentIdle,
  streaming: agentStreaming,
  permission: agentPermissionPending,
  permissionResolved: agentPermissionResolved,
  diff: agentDiffPending,
  diffSettled: agentDiffSettled,
} as const;

export type DocumentFixtureKey = keyof typeof documentFixtures;
export type AgentFixtureKey = keyof typeof agentFixtures;

/**
 * Derived, never hand-written. Anything that enumerates fixtures — the dev
 * switcher, search-param validation, the test gates — reads these, so adding a
 * fixture cannot leave a stale list behind.
 */
export const documentFixtureKeys = Object.keys(documentFixtures) as DocumentFixtureKey[];
export const agentFixtureKeys = Object.keys(agentFixtures) as AgentFixtureKey[];

/**
 * Flat enumeration of every addressable fixture combination, so the test gates
 * can iterate one list rather than a cross product. Each name is the `?state=`
 * value for that combination. Never remove an entry — see CLAUDE.md invariant 6.
 */
export const fixtureStates: { name: string; doc: DocumentFixtureKey; agent: AgentFixtureKey }[] =
  documentFixtureKeys.flatMap((doc) =>
    agentFixtureKeys.map((agent) => ({ name: `${doc}-${agent}`, doc, agent })),
  );

/** Resolve a `?state=` value to its two axes. Returns undefined for anything unknown. */
export function parseFixtureState(
  value: unknown,
): { doc: DocumentFixtureKey; agent: AgentFixtureKey } | undefined {
  const match = fixtureStates.find((state) => state.name === value);
  return match ? { doc: match.doc, agent: match.agent } : undefined;
}

import type {
  AgentSession,
  DocumentModel,
  DocumentTemplate,
  RecentFile,
} from "@/types/shell";

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
  mermaidVersion: "11.4.1",
};

export const multiBlockDocument: DocumentModel = {
  id: "doc-multi",
  fileName: "architecture.md",
  filePath: "~/projects/vellum/docs/architecture.md",
  saveState: "unsaved",
  lineCount: source.length,
  sourcePreview: source,
  blocks: [
    { id: "block-1", diagramType: "flowchart", startLine: 5, endLine: 10, state: "ready" },
    { id: "block-2", diagramType: "sequenceDiagram", startLine: 14, endLine: 19, state: "ready" },
    { id: "block-3", diagramType: "stateDiagram-v2", startLine: 23, endLine: 28, state: "ready" },
  ],
  diagnostics: [],
  cursor: { line: 6, column: 12 },
  mermaidVersion: "11.4.1",
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
    { kind: "toolCall", id: "item-4", toolName: "fs/read", target: "docs/architecture.md", status: "success" },
    { kind: "toolCall", id: "item-5", toolName: "fs/write", target: "docs/architecture.md#block-1", status: "running" },
  ],
  streamingText: "agent.message.streaming",
};

const { streamingText: _streamingText, ...streamingBase } = agentStreaming;

export const agentPermissionPending: AgentSession = {
  ...streamingBase,
  state: "awaiting-permission",
  items: [
    ...agentStreaming.items.slice(0, 4),
    { kind: "toolCall", id: "item-5", toolName: "fs/write", target: "docs/architecture.md#block-1", status: "pending" },
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

export const recentFiles: RecentFile[] = [
  { id: "r1", fileName: "architecture.md", filePath: "~/projects/vellum/docs/architecture.md", openedAtKey: "welcome.recent.openedAt.today" },
  { id: "r2", fileName: "acp-sequences.md", filePath: "~/projects/vellum/docs/acp-sequences.md", openedAtKey: "welcome.recent.openedAt.yesterday" },
  { id: "r3", fileName: "release-plan.md", filePath: "~/notes/release-plan.md", openedAtKey: "welcome.recent.openedAt.lastWeek" },
];

export const templates: DocumentTemplate[] = [
  { id: "t1", nameKey: "welcome.templates.flowchart.name", descriptionKey: "welcome.templates.flowchart.description", diagramType: "flowchart" },
  { id: "t2", nameKey: "welcome.templates.sequence.name", descriptionKey: "welcome.templates.sequence.description", diagramType: "sequenceDiagram" },
  { id: "t3", nameKey: "welcome.templates.state.name", descriptionKey: "welcome.templates.state.description", diagramType: "stateDiagram-v2" },
  { id: "t4", nameKey: "welcome.templates.er.name", descriptionKey: "welcome.templates.er.description", diagramType: "erDiagram" },
  { id: "t5", nameKey: "welcome.templates.class.name", descriptionKey: "welcome.templates.class.description", diagramType: "classDiagram" },
  { id: "t6", nameKey: "welcome.templates.gantt.name", descriptionKey: "welcome.templates.gantt.description", diagramType: "gantt" },
];

export const documentFixtures = {
  empty: emptyDocument,
  multi: multiBlockDocument,
  failed: failedBlockDocument,
} as const;

export const agentFixtures = {
  disconnected: agentDisconnected,
  idle: agentIdle,
  streaming: agentStreaming,
  permission: agentPermissionPending,
  diff: agentDiffPending,
} as const;

export type DocumentFixtureKey = keyof typeof documentFixtures;
export type AgentFixtureKey = keyof typeof agentFixtures;

/**
 * Flat enumeration of every addressable fixture combination, so the test gates
 * can iterate one list rather than a cross product. Each name is the `?state=`
 * value for that combination. Never remove an entry — see CLAUDE.md invariant 6.
 */
export const fixtureStates: { name: string; doc: DocumentFixtureKey; agent: AgentFixtureKey }[] = (
  Object.keys(documentFixtures) as DocumentFixtureKey[]
).flatMap((doc) =>
  (Object.keys(agentFixtures) as AgentFixtureKey[]).map((agent) => ({
    name: `${doc}-${agent}`,
    doc,
    agent,
  })),
);

/** Resolve a `?state=` value to its two axes. Returns undefined for anything unknown. */
export function parseFixtureState(
  value: unknown,
): { doc: DocumentFixtureKey; agent: AgentFixtureKey } | undefined {
  const match = fixtureStates.find((state) => state.name === value);
  return match ? { doc: match.doc, agent: match.agent } : undefined;
}

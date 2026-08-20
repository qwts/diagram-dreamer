import { parseDocument, toDocumentModel } from "@vellum/core";
import type { AgentSession, DocumentModel, DocumentTemplate, RecentFile } from "@/types/shell";

/**
 * Fixture documents are real Markdown, parsed by the real parser.
 *
 * They used to be hand-built models: a `sourcePreview` array beside a `blocks`
 * array whose `startLine`/`endLine` were maintained by counting. Every fixture
 * was then an assertion that someone had counted correctly, and a rendered
 * diagram could disagree with the text shown next to it without anything
 * noticing.
 *
 * Parsing them instead means `@vellum/core`'s parser is exercised by all 88
 * gates rather than only by its own unit tests, and a line number in a
 * diagnostic is one the parser produced — the same path a real document takes.
 */
const architecture = `---
mermaid: 11.17.0
---
# Deployment architecture

The renderer talks to the agent through a transport seam.

\`\`\`mermaid
flowchart LR
  accTitle: Renderer dependencies
  R[Renderer UI shell] --> C[core]
  R --> A[acp-client]
  A --> M[Main process]
\`\`\`

## Session handshake

\`\`\`mermaid
sequenceDiagram
  accTitle: Session handshake
  Renderer->>Main: session/new
  Main->>Agent: initialize
  Agent-->>Renderer: session/update
\`\`\`

## Document lifecycle

\`\`\`mermaid
stateDiagram-v2
  accTitle: Document lifecycle
  [*] --> Draft
  Draft --> Rendering
  Rendering --> Ready
\`\`\`
`;

/** Document line of `Renderer->>Main`, the line the `broken` fixture mangles. */
const HANDSHAKE_ARROW = 21;

export const emptyDocument: DocumentModel = toDocumentModel(
  {
    id: "doc-empty",
    fileName: "untitled.md",
    filePath: "~/documents/untitled.md",
  },
  parseDocument("# Untitled\n\n"),
);

export const multiBlockDocument: DocumentModel = {
  ...toDocumentModel(
    {
      id: "doc-multi",
      fileName: "architecture.md",
      filePath: "~/projects/vellum/docs/architecture.md",
      saveState: "unsaved",
    },
    parseDocument(architecture),
  ),
  cursor: { line: 9, column: 12 },
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
        line: HANDSHAKE_ARROW,
      },
    },
    {
      ...multiBlockDocument.blocks[2]!,
      state: "error",
      diagnostic: {
        id: "diag-2",
        severity: "warning",
        messageKey: "preview.diagnostic.lintLongLabel",
        line: 11,
      },
    },
  ],
  diagnostics: [
    {
      id: "diag-1",
      severity: "error",
      messageKey: "preview.diagnostic.parse",
      messageValues: { token: "-->>" },
      line: HANDSHAKE_ARROW,
    },
    {
      id: "diag-2",
      severity: "warning",
      messageKey: "preview.diagnostic.lintLongLabel",
      line: 11,
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
        line: 11,
      },
    },
  ],
  diagnostics: [
    {
      id: "diag-w1",
      severity: "warning",
      messageKey: "preview.diagnostic.lintLongLabel",
      line: 11,
    },
  ],
};

/**
 * Syntactically invalid Mermaid in an otherwise healthy document.
 *
 * The point is the *disagreement*: every block is `state: "ready"` and the
 * model carries no diagnostic, because nothing has tried to render yet. Only
 * Mermaid knows one block is broken, and it only finds out at render time. That
 * is the branch SPEC §6 describes — "the renderer never white-screens on a bad
 * block" — and no fixture reached it before, because `failed` hands the shell a
 * diagnostic that was decided for it.
 *
 * Mangled through the same parser as everything else, so the editor text and
 * the failing diagram cannot drift apart.
 */
const brokenMarkdown = architecture
  .split("\n")
  .map((line, index) => (index === HANDSHAKE_ARROW - 1 ? "  Renderer ->< Main: nope" : line))
  .join("\n");

export const brokenDocument: DocumentModel = {
  ...toDocumentModel(
    {
      id: "doc-broken",
      fileName: "broken.md",
      filePath: "~/projects/vellum/docs/broken.md",
      saveState: "unsaved",
    },
    parseDocument(brokenMarkdown),
  ),
  cursor: { line: HANDSHAKE_ARROW, column: 1 },
};

const baseItems: AgentSession["items"] = [
  { kind: "text", id: "item-1", bodyKey: "agent.message.greeting" },
];

export const agentDisconnected: AgentSession = {
  state: "disconnected",
  agentName: "Claude Code",
  items: [],
};

/**
 * The block the agent fixtures point at, and the lines it occupies.
 *
 * Read from the parsed document rather than written out, because block ids are
 * content hashes now and the line numbers move whenever the fixture prose does.
 * A literal would go stale the first time either changed, and the context chip
 * would name a block that is not in the document.
 */
const contextBlock = multiBlockDocument.blocks[0]!;
const contextBlockId = contextBlock.id;

export const agentIdle: AgentSession = {
  state: "idle",
  agentName: "Claude Code",
  items: baseItems,
};

export const agentStreaming: AgentSession = {
  state: "streaming",
  agentName: "Claude Code",
  contextBlockId,
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
      target: `docs/architecture.md#${contextBlockId}`,
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
      target: `docs/architecture.md#${contextBlockId}`,
      status: "pending",
    },
  ],
  permission: {
    id: "perm-1",
    toolName: "fs/write",
    targetSummary: `docs/architecture.md — replace lines ${contextBlock.startLine}-${contextBlock.endLine}`,
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
      target: `docs/architecture.md#${contextBlockId}`,
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

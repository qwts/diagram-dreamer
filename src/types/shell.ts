/** Presentation-only contracts. No logic lives in the shell; all data arrives via props. */

export type SaveState = "saved" | "unsaved" | "saving" | "error";

export type DiagnosticSeverity = "error" | "warning";

export interface Diagnostic {
  id: string;
  severity: DiagnosticSeverity;
  messageKey: string;
  messageValues?: Record<string, string | number> | undefined;
  line: number;
  column?: number | undefined;
}

export type DiagramBlockState = "empty" | "loading" | "ready" | "error";

export interface DiagramBlock {
  id: string;
  /** e.g. "flowchart", "sequenceDiagram" — displayed verbatim, not translated. */
  diagramType: string;
  startLine: number;
  endLine: number;
  state: DiagramBlockState;
  diagnostic?: Diagnostic | undefined;
  /**
   * Mermaid `accTitle` / `accDescr`, surfaced from the diagram source (SPEC §9).
   * Author-supplied content, so already in the document's language — never run
   * through i18next. When accTitle is absent the frame falls back to naming the
   * block by id, which identifies but does not describe it.
   */
  accTitle?: string | undefined;
  accDescr?: string | undefined;
}

export interface DocumentModel {
  id: string;
  fileName: string;
  filePath: string;
  saveState: SaveState;
  lineCount: number;
  /** Placeholder source shown in the editor frame until CodeMirror mounts. */
  sourcePreview: string[];
  blocks: DiagramBlock[];
  diagnostics: Diagnostic[];
  cursor: { line: number; column: number };
  /**
   * Frontmatter — per-document config (SPEC §5). All three are declared by the
   * document, parsed by `packages/core`, and only ever displayed here.
   *
   * `theme` is the document's *diagram* theme (mermaid's `default` / `dark` /
   * `forest` / `neutral` / `base`, or a site theme), which is **not**
   * `ThemePreference`: that is the application chrome's light/dark/system
   * setting and belongs to the user, not the file. Kept as a string for the
   * same reason `mermaidVersion` is — the set of valid values is mermaid's to
   * define, and the shell must not encode it.
   *
   * `direction` is the document's own RTL hint. Per Q4 the shell does not act
   * on it: `<html lang>`/`<html dir>` follow the UI language via
   * `DocumentLanguage`, because in Electron the renderer owns that. This field
   * exists so a document that declares its own direction has somewhere to say
   * so once `packages/core` can honour it per-preview.
   */
  theme?: string | undefined;
  mermaidVersion: string;
  direction?: "ltr" | "rtl" | undefined;
}

export type AgentConnectionState = "disconnected" | "idle" | "streaming" | "awaiting-permission";

export type ToolCallStatus = "pending" | "running" | "success" | "failed";
export type PlanStepStatus = "pending" | "active" | "done";

export interface AgentTextItem {
  kind: "text";
  id: string;
  bodyKey: string;
  streaming?: boolean | undefined;
}

export interface AgentPlanItem {
  kind: "plan";
  id: string;
  steps: { id: string; labelKey: string; status: PlanStepStatus }[];
}

export interface AgentToolCallItem {
  kind: "toolCall";
  id: string;
  toolName: string;
  target: string;
  status: ToolCallStatus;
}

export type AgentItem = AgentTextItem | AgentPlanItem | AgentToolCallItem;

export type PermissionResolution = "allowOnce" | "alwaysSession" | "deny";

export interface PermissionRequest {
  id: string;
  toolName: string;
  targetSummary: string;
  resolution?: PermissionResolution | undefined;
}

export interface DiffPreview {
  id: string;
  titleKey: string;
  filePath: string;
  before: string[];
  after: string[];
  status: "pending" | "accepted" | "rejected";
}

export interface AgentSession {
  state: AgentConnectionState;
  agentName: string;
  items: AgentItem[];
  streamingText?: string | undefined;
  permission?: PermissionRequest | undefined;
  diff?: DiffPreview | undefined;
  contextBlockId?: string | undefined;
}

export interface RecentFile {
  id: string;
  fileName: string;
  filePath: string;
  openedAtKey: string;
}

export interface DocumentTemplate {
  id: string;
  nameKey: string;
  descriptionKey: string;
  diagramType: string;
}

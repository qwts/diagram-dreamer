/**
 * Domain contracts, plus the render pipeline they describe.
 *
 * This file was types-only through Phase 3. M2 brings the first real logic into
 * the package — `./render` — which is the point: SPEC §4 puts load-bearing
 * logic here precisely so the shell never grows any. The contracts below stay
 * what they were.
 *
 * These are the shapes the renderer is handed, extracted per CLAUDE.md Phase 3
 * so the shell and whatever eventually produces this data agree on one
 * definition. Nothing here imports anything; nothing here executes.
 *
 * ---
 *
 * **Known tension, deliberately not resolved here.** Several fields carry
 * *i18next keys* rather than data: `Diagnostic.messageKey`,
 * `AgentTextItem.bodyKey`, `AgentPlanItem.steps[].labelKey`,
 * `DiffPreview.titleKey`. That is a presentation concern sitting in what is
 * meant to be a domain contract — a real `core` would emit a stable code plus
 * values and let the shell choose the wording, because a headless core has no
 * business knowing i18next exists.
 *
 * It is left as-is on purpose. Phase 3 is a types-only extraction; changing
 * these fields is a contract redesign that would touch every fixture and every
 * component, and it wants the real `core` in front of it to design against.
 * Flagged rather than silently reinterpreted (CLAUDE.md invariant 8), and
 * recorded in `docs/AUDIT.md`.
 */

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
   * The block's Mermaid source — what actually gets rendered (SPEC §6).
   *
   * Optional because the shell must still work without it: with no source the
   * frame shows its mount placeholder, which is what keeps the fixtures and the
   * `?state=` switcher meaningful as pure presentation. A parsed document
   * always sets it.
   */
  source?: string | undefined;
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
   * document, parsed here once this package has a parser, and only ever
   * displayed by the shell.
   *
   * `theme` is the document's *diagram* theme (mermaid's `default` / `dark` /
   * `forest` / `neutral` / `base`, or a site theme), which is **not** the
   * shell's `ThemePreference`: that is the application chrome's
   * light/dark/system setting and belongs to the user, not the file. Kept as a
   * string for the same reason `mermaidVersion` is — the set of valid values is
   * mermaid's to define, and neither this package nor the shell should encode
   * it.
   *
   * `direction` is the document's own RTL hint. Per Q4 the shell does not act
   * on it: `<html lang>`/`<html dir>` follow the UI language, because in
   * Electron the renderer owns that. This field exists so a document that
   * declares its own direction has somewhere to say so once this package can
   * honour it per-preview.
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

/**
 * Render pipeline (SPEC §6). `render/sandbox` is deliberately **not**
 * re-exported here: it pulls in the whole of Mermaid, and only the sandbox
 * document should ever do that. The app reaches it as `@vellum/core/sandbox`,
 * which keeps a megabyte of diagram library out of every importer of a type.
 */
export { DiagramRenderer } from "./render/renderer";
export type {
  DiagramRendererOptions,
  DiagramSurface,
  RenderOptions,
  RenderResult,
} from "./render/renderer";
export { PROTOCOL_VERSION } from "./render/protocol";

/** Document model (SPEC §5). Pure functions of text; no I/O. */
export { DEFAULT_MERMAID_VERSION, parseDocument, toDocumentModel } from "./document/parse";
export type { DocumentIdentity, ParsedDocument, ParseOptions } from "./document/parse";

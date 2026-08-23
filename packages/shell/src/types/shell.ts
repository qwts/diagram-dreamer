/**
 * The shell's view of the type system, and the seam between the two halves of
 * it.
 *
 * Everything re-exported below now lives in `@vellum/core` (CLAUDE.md Phase 3):
 * those are domain contracts, shared with whatever eventually produces the
 * data. They are re-exported rather than imported directly at each call site so
 * the boundary is stated once, here, instead of being spread across forty
 * imports — and so moving a type across it is a one-line change in this file.
 *
 * What stays below the re-export is what genuinely belongs to the shell: view
 * models assembled for a specific screen, carrying i18next keys and no domain
 * meaning. `core` should never learn about them.
 *
 * No logic lives in the shell; all data arrives via props.
 */

export type {
  AgentConnectionState,
  AgentItem,
  AgentPlanItem,
  AgentSession,
  AgentTextItem,
  AgentToolCallItem,
  DiagnosticSeverity,
  Diagnostic,
  DiagramBlock,
  DiagramBlockState,
  DiffPreview,
  DocumentModel,
  PermissionRequest,
  PermissionResolution,
  PlanStepStatus,
  SaveState,
  ToolCallStatus,
} from "@vellum/core";

/** Welcome-screen view model. `openedAtKey` is an i18next key, not a timestamp. */
export interface RecentFile {
  id: string;
  fileName: string;
  filePath: string;
  openedAtKey: string;
}

/** Welcome-screen view model. Both `*Key` fields are i18next keys. */
export interface DocumentTemplate {
  id: string;
  nameKey: string;
  descriptionKey: string;
  diagramType: string;
}

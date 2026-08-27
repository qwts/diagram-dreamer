/**
 * Test-side view of the fixture enumeration and the testid registry.
 *
 * Both are imported from the shell rather than restated, so a fixture or id added
 * there is covered here automatically and cannot drift — a PR review caught an
 * earlier smoke script that hardcoded its own list.
 */
export {
  fixtureStates,
  documentFixtureKeys,
  agentFixtureKeys,
  testIds,
} from "@vellum/shell/testing";

/** Ids that must be present on every workspace state, whatever the fixture. */
export const ALWAYS_PRESENT = [
  "workspace.layout.root",
  "workspace.layout.main",
  "workspace.split-pane.root",
  "workspace.toolbar.root",
  "workspace.toolbar.file-name",
  "workspace.toolbar.save-state",
  // The document actions are present under every host, whatever that host can
  // do — a capability it lacks disables the control and explains it, never
  // removes it (#27). Listing them here is what makes "never removes it" a
  // gate rather than a comment.
  "workspace.toolbar.save",
  "workspace.toolbar.export-menu",
  "workspace.status-bar.root",
  "workspace.status-bar.cursor-position",
  "workspace.status-bar.diagnostics-count",
  "workspace.agent-chip.root",
  "editor.host.root",
  "editor.toolbar.root",
  "editor.gutter.root",
  "preview.pane.root",
  "preview.pane.toolbar",
] as const;

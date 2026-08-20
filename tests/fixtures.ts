/**
 * Test-side view of the fixture enumeration and the testid registry.
 *
 * Both are imported from `src/` rather than restated, so a fixture or id added
 * there is covered here automatically and cannot drift — a PR review caught an
 * earlier smoke script that hardcoded its own list.
 */
export { fixtureStates, documentFixtureKeys, agentFixtureKeys } from "../src/fixtures";
export { testIds } from "../src/testids";

/** Ids that must be present on every workspace state, whatever the fixture. */
export const ALWAYS_PRESENT = [
  "workspace.layout.root",
  "workspace.layout.main",
  "workspace.split-pane.root",
  "workspace.toolbar.root",
  "workspace.toolbar.file-name",
  "workspace.toolbar.save-state",
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

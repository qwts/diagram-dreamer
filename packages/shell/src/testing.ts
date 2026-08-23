/**
 * The test seams, on their own subpath.
 *
 * Fixtures, the `?state=` keys, and the test-id registry are load-bearing
 * (CLAUDE.md invariants 5 and 6) and the gates import them rather than
 * restating them — a fixture or id added here reaches the specs without anyone
 * remembering to copy it.
 *
 * Separate from the package's main export deliberately: a host composition root
 * has no business reading fixtures, and keeping them off `.` means an
 * accidental import in application code is a visible one.
 */

export { fixtureStates, documentFixtureKeys, agentFixtureKeys } from "./fixtures";
export type { DocumentFixtureKey, AgentFixtureKey } from "./fixtures";
export { testIds } from "./testids";

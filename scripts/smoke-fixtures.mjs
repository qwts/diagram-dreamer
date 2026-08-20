/**
 * Cheap pre-Playwright smoke: fetch every ?state= fixture from a running dev
 * server and assert the route accepts it. Does not render — the real per-state
 * render + axe assertions are the Phase 2 Playwright gate. This exists so a
 * broken fixture enumeration is caught without a browser.
 *
 * Usage: npm run dev, then node scripts/smoke-fixtures.mjs
 */
const BASE = process.env["SMOKE_BASE"] ?? "http://localhost:5173";

const DOCS = ["empty", "multi", "failed"];
const AGENTS = ["disconnected", "idle", "streaming", "permission", "diff"];
const states = DOCS.flatMap((doc) => AGENTS.map((agent) => `${doc}-${agent}`));

let failed = 0;
for (const state of states) {
  const url = `${BASE}/?state=${state}`;
  try {
    const res = await fetch(url);
    const body = await res.text();
    const servesApp = res.ok && body.includes('id="root"');
    if (!servesApp) {
      failed += 1;
      console.log(`  FAIL  ${state}  (HTTP ${res.status})`);
      continue;
    }
    console.log(`  ok    ${state}`);
  } catch (error) {
    failed += 1;
    console.log(`  FAIL  ${state}  ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(
  failed === 0
    ? `\n${states.length} fixture states reachable.\n`
    : `\n${failed} of ${states.length} fixture states failed.\n`,
);
process.exit(failed === 0 ? 0 : 1);

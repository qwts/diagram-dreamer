import { test, expect } from "@playwright/test";

import { fixtureStates } from "../tests/fixtures";

/**
 * Pseudo-localization gate (CLAUDE.md Phase 2, SPEC §9): no raw keys, no
 * clipped critical labels.
 *
 * Runs against a `VITE_PSEUDO=1` build, where every string is accented,
 * expanded ~35% and wrapped in ⟦…⟧. Any text that never went through i18next
 * stays plain ASCII and is therefore trivially detectable.
 */

/** Text that legitimately is not translated: file paths, ids, versions, code. */
const UNTRANSLATED_TESTIDS = new Set([
  "workspace.toolbar.file-name",
  "preview.diagram-frame.block-id",
  "preview.diagram-frame.diagram-type",
  // Tool names and their targets are agent payload — "fs/write",
  // "docs/architecture.md#block-1". Translating them would be wrong.
  "agent.transcript.tool-call",
  // The editor renders the document's own markdown source.
  "editor.host.mount-slot",
]);

test("every visible label went through i18next", async ({ page }) => {
  await page.goto("/?state=failed-permission");
  await expect(page.getByTestId("workspace.layout.root")).toBeVisible();

  const untranslated = await page.evaluate(
    (exempt: string[]) => {
      const offenders: string[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node.textContent?.trim() ?? "";
        if (text.length < 3) continue;
        const element = node.parentElement;
        if (!element) continue;
        if (element.closest("pre")) continue; // diff bodies are document content
        if (exempt.some((id) => element.closest(`[data-testid="${id}"]`))) continue;
        // A translated string always carries the pseudo delimiters.
        if (!text.includes("⟦") && /[A-Za-z]{3,}/.test(text)) offenders.push(text.slice(0, 60));
      }
      return offenders;
    },
    [...UNTRANSLATED_TESTIDS],
  );

  expect(untranslated, "these strings bypassed i18next").toEqual([]);
});

test("no raw i18n keys survive in the pseudo build", async ({ page }) => {
  for (const state of fixtureStates.slice(0, 5)) {
    await page.goto(`/?state=${state.name}`);
    const body = await page.locator("body").innerText();
    expect(body, `raw key in ${state.name}`).not.toMatch(
      /\b(workspace|agent|preview|editor|settings|welcome)\.[a-z][A-Za-z]*\.[a-zA-Z.]+/,
    );
  }
});

test("expanded labels are not clipped", async ({ page }) => {
  await page.goto("/?state=failed-permission");

  // Elements whose label must stay fully readable when a translation runs long.
  const critical = [
    "agent.permission.allow-once",
    "agent.permission.always-session",
    "agent.permission.deny",
    "workspace.toolbar.export",
    "agent.panel.close",
  ];

  for (const id of critical) {
    const locator = page.getByTestId(id);
    if ((await locator.count()) === 0) continue;
    const clipped = await locator.first().evaluate((el) => {
      // 1px of tolerance for sub-pixel rounding.
      return el.scrollWidth > el.clientWidth + 1;
    });
    expect(clipped, `${id} clips its expanded label`).toBe(false);
  }
});

import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

import { fixtureStates } from "./fixtures";

/**
 * Per CLAUDE.md Phase 2: axe-core per fixture state, zero violations at
 * WCAG 2.1 AA. Run in both themes, because the token set differs and the
 * contrast rules are the ones most likely to diverge between them.
 */

const WCAG_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function analyze(page: import("@playwright/test").Page) {
  return new AxeBuilder({ page }).withTags(WCAG_AA).analyze();
}

function describeViolations(violations: Awaited<ReturnType<typeof analyze>>["violations"]) {
  return violations
    .map(
      (v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target).join("\n    ")}`,
    )
    .join("\n");
}

for (const state of fixtureStates) {
  test(`${state.name} has no WCAG 2.1 AA violations`, async ({ page }) => {
    await page.goto(`/?state=${state.name}`);
    await expect(page.getByTestId("workspace.layout.root")).toBeVisible();

    const { violations } = await analyze(page);
    expect(describeViolations(violations)).toBe("");
  });
}

test("dark theme has no WCAG 2.1 AA violations", async ({ page }) => {
  await page.goto("/?state=failed-permission");
  await page.getByTestId("workspace.toolbar.theme-toggle").click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  // The `dark` class lands before the colours do: theme-sensitive surfaces
  // carry `transition-colors`, so a computed style read straight after the
  // toggle returns a value part-way between the two themes, and axe scores that
  // blend against the new text colour. Wait for a known dark token to actually
  // be painted before analysing.
  await expect
    .poll(
      () =>
        page
          .getByTestId("workspace.agent-chip.root")
          .evaluate((el) => getComputedStyle(el).backgroundColor),
      { message: "theme colours never settled to the dark palette" },
    )
    .toBe("rgb(23, 48, 47)"); // --tertiary-surface, dark

  const { violations } = await analyze(page);
  expect(describeViolations(violations)).toBe("");
});

test("the welcome route has no WCAG 2.1 AA violations", async ({ page }) => {
  await page.goto("/welcome");
  await expect(page.getByTestId("welcome.page.root")).toBeVisible();

  const { violations } = await analyze(page);
  expect(describeViolations(violations)).toBe("");
});

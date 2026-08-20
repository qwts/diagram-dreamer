import { test, expect } from "@playwright/test";

/**
 * RTL smoke (CLAUDE.md Phase 2): dir=rtl renders, panes mirror.
 *
 * Only `en` resources are bundled, so choosing Arabic leaves the strings in
 * English while flipping direction — which is exactly what this gate needs.
 * It proves the layout mirrors without requiring a translated bundle.
 */
async function selectArabic(page: import("@playwright/test").Page) {
  await page.getByTestId("workspace.toolbar.settings").click();
  await page.getByTestId("settings.dialog.language").click();
  await page.getByRole("option", { name: "Arabic" }).click();

  // Radix keeps the select popup and the dialog mounted through their close
  // animations. Assertions taken while they are still in the tree describe a
  // half-dismissed dropdown rather than the workspace, so wait for both to
  // detach before measuring anything.
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("settings.dialog.root")).toHaveCount(0);
}

test("selecting an RTL language flips dir and mirrors the workspace", async ({ page }) => {
  await page.goto("/?state=multi-streaming");

  const editor = page.getByTestId("editor.host.root");
  const agent = page.getByTestId("agent.panel.root");

  const ltrEditorX = (await editor.boundingBox())?.x ?? 0;
  const ltrAgentX = (await agent.boundingBox())?.x ?? 0;
  expect(ltrEditorX, "editor should start left of the agent panel in LTR").toBeLessThan(ltrAgentX);

  await selectArabic(page);

  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");

  const rtlEditorX = (await editor.boundingBox())?.x ?? 0;
  const rtlAgentX = (await agent.boundingBox())?.x ?? 0;
  expect(rtlEditorX, "editor should start right of the agent panel in RTL").toBeGreaterThan(
    rtlAgentX,
  );
});

test("RTL layout has no WCAG 2.1 AA violations", async ({ page }) => {
  const AxeBuilder = (await import("@axe-core/playwright")).default;
  await page.goto("/?state=failed-permission");
  await selectArabic(page);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(
    violations
      .map((v) => `${v.id}: ${v.help}\n    ${v.nodes.map((n) => n.target).join("\n    ")}`)
      .join("\n"),
  ).toBe("");
});

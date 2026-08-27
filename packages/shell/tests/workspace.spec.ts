import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";

import { fixtureStates, documentFixtureKeys, ALWAYS_PRESENT } from "./fixtures";

/**
 * Per CLAUDE.md Phase 2: for each `?state=` fixture — renders, no console
 * errors, key testids present.
 */

function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message: ConsoleMessage) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  return errors;
}

for (const state of fixtureStates) {
  test(`${state.name} renders cleanly`, async ({ page }) => {
    const errors = collectPageErrors(page);

    await page.goto(`/?state=${state.name}`);
    await expect(page.getByTestId("workspace.layout.root")).toBeVisible();

    for (const id of ALWAYS_PRESENT) {
      await expect(page.getByTestId(id), `missing testid ${id}`).toBeAttached();
    }

    // No untranslated keys anywhere on the page. Raw i18next keys look like
    // "workspace.save.unsaved" — this is the exact defect that started the
    // hardening pass, so it is asserted on every state.
    const body = (await page.locator("body").innerText()).trim();
    expect(body, "page rendered empty").not.toBe("");
    expect(body, "raw i18n key leaked into the UI").not.toMatch(
      /\b(workspace|agent|agentChip|preview|editor|settings|welcome|fixtures|error)\.[a-z][A-Za-z]*\.[a-zA-Z.]+/,
    );

    expect(errors, `console errors on ${state.name}`).toEqual([]);
  });
}

test("agent panel is a complementary landmark and the editor/preview are labelled regions", async ({
  page,
}) => {
  await page.goto("/?state=multi-streaming");
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("aside")).toHaveCount(1);
  await expect(page.locator('[role="toolbar"]').first()).toBeAttached();
  await expect(page.locator('[role="status"]')).toHaveCount(1);
});

test("F6 cycles focus across the major regions", async ({ page }) => {
  await page.goto("/?state=multi-streaming");
  // Start from a control in the header, which is outside all four cycled
  // regions — clicking the page body would land inside whichever pane happens
  // to sit under the cursor and change where the cycle begins.
  await page.getByTestId("workspace.toolbar.theme-toggle").focus();

  const regionIds = [
    "editor.host.scroll-container",
    "preview.pane.root",
    "agent.panel.root",
    "workspace.status-bar.root",
  ];

  for (const expected of regionIds) {
    await page.keyboard.press("F6");
    const focused = await page.evaluate(
      () => window.document.activeElement?.getAttribute("data-testid") ?? null,
    );
    expect(focused, `F6 should have landed on ${expected}`).toBe(expected);
  }
});

test("diagnostics count uses warning tones when nothing is an error", async ({ page }) => {
  // The `warned` fixture exists specifically to cover this branch: warnings must
  // never borrow danger tokens (CLAUDE.md invariant 3).
  await page.goto("/?state=warned-idle");
  const count = page.getByTestId("workspace.status-bar.diagnostics-count");
  await expect(count).toBeVisible();
  await expect(count).toHaveClass(/text-warning/);
  await expect(count).not.toHaveClass(/text-danger/);

  await page.goto("/?state=failed-idle");
  await expect(page.getByTestId("workspace.status-bar.diagnostics-count")).toHaveClass(
    /text-danger/,
  );
});

test("the permission card does not steal focus when it appears", async ({ page }) => {
  await page.goto("/?state=multi-permission");
  await expect(page.getByTestId("agent.permission.root")).toBeVisible();

  const focusedTestId = await page.evaluate(
    () => window.document.activeElement?.getAttribute("data-testid") ?? null,
  );
  expect(focusedTestId).not.toBe("agent.permission.root");

  // ...but it is announced in the polite live region.
  await expect(page.getByTestId("agent.transcript.announcement")).toContainText(/permission/i);
});

test("diagrams pan by keyboard, and fit restores both axes", async ({ page }) => {
  // SPEC §9 requires pan "via keyboard". The viewport is the control, so it
  // must be reachable and must consume the arrow keys only while focused.
  await page.goto("/?state=multi-idle");
  const viewport = page.getByTestId("preview.diagram-frame.viewport").first();
  const slot = page.getByTestId("preview.diagram-frame.mount-slot").first();

  // `translate: 0px 0px` computes to the shorthand "0px", not "none".
  const NEUTRAL = "0px";
  const translate = () => slot.evaluate((node) => window.getComputedStyle(node).translate);

  await expect(viewport).toBeVisible();
  expect(await translate()).toBe(NEUTRAL);

  await viewport.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  // Right and down move the view, so the content moves the other way.
  expect(await translate()).toBe("-24px -24px");

  // Shift takes the coarser step rather than repeating the fine one.
  await page.keyboard.press("Shift+ArrowLeft");
  expect(await translate()).toBe("72px -24px");

  // Reset-pan is offered only once there is something to reset.
  const panReset = page.getByTestId("preview.diagram-frame.pan-reset").first();
  await expect(panReset).toBeEnabled();
  await panReset.click();
  expect(await translate()).toBe(NEUTRAL);
  await expect(panReset).toBeDisabled();

  // Fit restores pan as well as zoom — the property that makes it more than a
  // duplicate of reset-zoom.
  await viewport.focus();
  await page.keyboard.press("ArrowUp");
  expect(await translate()).toBe("0px 24px");

  // Fit is offered only once the sandbox has reported a size, the same way
  // reset-pan is offered only once there is pan to reset (#16). Asserting it
  // here is what makes the wait a stated contract rather than a side effect of
  // Playwright's actionability check.
  const zoomFit = page.getByTestId("preview.diagram-frame.zoom-fit").first();
  await expect(zoomFit).toBeEnabled();
  await zoomFit.click();
  expect(await translate()).toBe(NEUTRAL);

  // ...and now that the sandbox reports a rendered size, fit also *fits*. The
  // flowchart fixture is wider than the preview pane, so fitting it must scale
  // below 100% — the assertion that separates fitting from resetting.
  const zoomLabel = page.locator("footer", { hasText: "Zoom" }).first();
  await expect(zoomLabel).not.toContainText("Zoom 100 percent");
});

/**
 * This replaces a test that asserted Save was *enabled* on an unsaved document
 * — which it was, and which was the bug: `WorkspaceLayout` accepted no `onSave`
 * at all, so the control was live and inert and the gate called that correct.
 *
 * What is left here is the part that is true under any host. Whether Save is
 * enabled now depends on whether the host supplied `saveDocument`, and the two
 * hosts answer differently on purpose, so that assertion moved into each
 * host's own `tests/capabilities.spec.ts`, where a host can be named. The
 * shape of the toolbar is host-neutral and stays here.
 */
test("the document actions keep the same shape on every document state", async ({ page }) => {
  const shapeOf = async (state: string) => {
    await page.goto(`/?state=${state}`);
    await expect(page.getByTestId("workspace.toolbar.root")).toBeVisible();
    return page
      .getByTestId("workspace.toolbar.root")
      .locator("button[data-testid]")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-testid")));
  };

  const [first, ...rest] = documentFixtureKeys;
  const baseline = await shapeOf(`${first}-idle`);

  // Named explicitly so a regression that drops both reads as a missing
  // control rather than as two identically empty toolbars agreeing.
  expect(baseline).toContain("workspace.toolbar.save");
  expect(baseline).toContain("workspace.toolbar.export-menu");

  // Controls are disabled, never removed. That is what keeps the toolbar's
  // roving focus positional: hiding one would renumber every control after it,
  // so the same arrow keys would reach different actions depending on the
  // document — or on the host (CLAUDE.md invariant 7).
  for (const key of rest) {
    expect(await shapeOf(`${key}-idle`), `toolbar shape differs on ${key}`).toEqual(baseline);
  }
});

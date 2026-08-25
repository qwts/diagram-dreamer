import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";

/**
 * The editor (SPEC §5, Open Question 1 — CodeMirror 6).
 *
 * The assertions worth having here are the ones about the seam between the
 * editor and everything else: that typing reaches the preview, that it reaches
 * only the block it changed, and that a keyboard user can get into the editor
 * at all. Whether CodeMirror can insert a character is CodeMirror's problem.
 */

function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message: ConsoleMessage) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  return errors;
}

const blockIds = (page: Page) => page.getByTestId("preview.diagram-frame.block-id").allInnerTexts();

test("the editor is reachable by keyboard", async ({ page }) => {
  await page.goto("/?state=multi-idle");
  await expect(page.locator(".cm-content")).toBeVisible();

  // CodeMirror's content is `contenteditable`, which Chrome leaves out of the
  // tab order — the editor was unreachable by keyboard until it was given an
  // explicit tabindex, and nothing else in the suite would have noticed.
  await page.getByTestId("editor.toolbar.wrap-toggle").focus();
  await page.keyboard.press("Tab");
  await expect(page.locator(".cm-content")).toBeFocused();

  // And escapable: Tab must leave again, or the editor is a keyboard trap.
  await page.keyboard.press("Tab");
  await expect(page.locator(".cm-content")).not.toBeFocused();
});

test("the caret position reaches the status bar", async ({ page }) => {
  await page.goto("/?state=multi-idle");
  const status = page.getByTestId("workspace.status-bar.cursor-position");

  // The fixture declares where the caret starts, and the editor is seeded from
  // it, so the two agree before anything is touched. Matched whole, not by
  // substring: "Line 9, column 12" contains a "1" and would let almost any
  // wrong answer through.
  await expect(status).toHaveText(/\b9\b.*\b12\b/);

  await page.locator(".cm-content").click();
  await page.keyboard.press("ControlOrMeta+Home");
  await expect(status).toHaveText(/\b1\b.*\b1\b/);
});

test("typing re-renders only the block that changed", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto("/?state=multi-idle");
  await expect(page.locator("iframe")).toHaveCount(3);

  const before = await blockIds(page);
  expect(before, "three fixture blocks").toHaveLength(3);

  // Mark the second block's sandbox. If editing the first block churns every
  // id, React remounts all three frames and the mark goes with them — which is
  // exactly what a positional block id would have done, and why SPEC §5 asks
  // for a content hash.
  await page
    .locator("iframe")
    .nth(1)
    .evaluate((node) => {
      node.setAttribute("data-original", "yes");
    });

  // Line 12 is inside the first block, `R --> A[acp-client]`.
  await page.locator(".cm-content").click();
  await page.keyboard.press("ControlOrMeta+Home");
  for (let i = 0; i < 11; i += 1) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("End");
  await page.keyboard.type("  R --> Q[queue]");

  await expect(async () => {
    const after = await blockIds(page);
    expect(after[0], "the edited block is re-identified by its new content").not.toBe(before[0]);
    expect(after.slice(1), "untouched blocks keep their identity").toEqual(before.slice(1));
  }).toPass({ timeout: 10_000 });

  await expect(page.locator("iframe").nth(1)).toHaveAttribute("data-original", "yes");
  expect(errors, "console errors while typing").toEqual([]);
});

test("an edit that breaks a diagram surfaces a diagnostic, and undo restores it", async ({
  page,
}) => {
  await page.goto("/?state=multi-idle");
  await expect(page.frameLocator("iframe").first().locator("#surface svg")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("preview.diagram-frame.error-card")).toHaveCount(0);

  await page.locator(".cm-content").click();
  await page.keyboard.press("ControlOrMeta+Home");
  for (let i = 0; i < 11; i += 1) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("End");
  await page.keyboard.type("\n  R -->< nonsense");

  await expect(page.getByTestId("preview.diagram-frame.error-card").first()).toBeVisible({
    timeout: 30_000,
  });

  // Undo is the reason the editor is updated by transaction rather than
  // rebuilt: a rebuilt view has no history, and the document would be
  // unrecoverable by the one keystroke every editor user reaches for first.
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.getByTestId("preview.diagram-frame.error-card")).toHaveCount(0, {
    timeout: 30_000,
  });
});

test("model diagnostics show in the gutter beside their line", async ({ page }) => {
  await page.goto("/?state=failed-idle");

  const badges = page.getByTestId("editor.gutter.error-badge");
  await expect(badges).toHaveCount(2);
  await expect(badges.first()).toHaveAttribute("aria-label", /11/);
  await expect(badges.last()).toHaveAttribute("aria-label", /21/);
});

test("diagnostics are announced, not only drawn", async ({ page }) => {
  await page.goto("/?state=failed-idle");

  // The gutter badges are invisible to assistive technology — CodeMirror marks
  // `.cm-gutters` aria-hidden, and a label on a descendant cannot undo a hidden
  // ancestor. Asserting the badge's `aria-label` therefore proves nothing about
  // what is announced, which is what this test is for.
  const announcer = page.getByTestId("editor.host.announcer");
  await expect(announcer).toHaveAttribute("aria-live", "polite");
  await expect(announcer).toContainText("Error on line 21");
  await expect(announcer).toContainText("Warning on line 11");

  // And the announcement is reachable through the accessibility tree, which is
  // the part a DOM query cannot tell you.
  const entries = page.getByRole("log", { name: "Diagram diagnostics" }).getByRole("listitem");
  await expect(entries).toHaveCount(2);
});

test("a diagram the sandbox rejects reaches the gutter and the status bar", async ({ page }) => {
  await page.goto("/?state=broken-idle");

  // The `broken` fixture's model is clean: every block is "ready" and it
  // carries no diagnostic, because nothing had tried to render yet. Only
  // Mermaid knows, and only at render time — so this is the path where the
  // preview used to show a red card while the rest of the workspace called the
  // document fine.
  await expect(page.getByTestId("preview.diagram-frame.error-card")).toBeVisible({
    timeout: 30_000,
  });

  await expect(page.getByTestId("editor.gutter.error-badge")).toHaveCount(1, { timeout: 10_000 });
  await expect(page.getByTestId("editor.host.announcer")).toContainText("Error on line 21");
  await expect(page.getByTestId("workspace.status-bar.diagnostics-count")).not.toContainText("0");
});

test("a freshly loaded document starts clean", async ({ page }) => {
  await page.goto("/?doc=multi");
  await expect(page.locator(".cm-content")).toBeVisible();

  await page.locator(".cm-content").click();
  await page.keyboard.type("XYZZY");
  await expect(page.locator(".cm-content")).toContainText("XYZZY");

  await page.goto("/?doc=empty");
  await expect(page.locator(".cm-content")).toContainText("Untitled");
  await expect(page.getByTestId("workspace.toolbar.save-state")).not.toContainText("Unsaved");

  await page.locator(".cm-content").click();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.locator(".cm-content")).not.toContainText("XYZZY");
});

/**
 * Not covered here: loading a different document *into a live editor*, where
 * `syncKey` changes and the view is rewritten in place. The replacement is
 * annotated as external and resets the undo history, because otherwise it
 * would mark the new document as edited and let one undo restore the previous
 * document's text under the new document's identity.
 *
 * No test drives that branch, because nothing in the built app reaches it: the
 * router uses memory history and the document is chosen at load, so every
 * document change today is a full page load with a fresh editor — verified by
 * removing the history reset and watching the test above still pass. It
 * becomes reachable with File → Open, and covering it belongs with that work
 * rather than being simulated here.
 */

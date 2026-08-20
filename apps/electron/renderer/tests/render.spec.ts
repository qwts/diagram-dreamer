import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";

/**
 * The render pipeline gate (SPEC §6).
 *
 * These run against the built artifact, which is the only place the real
 * security posture exists: `dist/sandbox.html` carries a hash-pinned CSP that
 * the dev server strips, so a policy mistake is invisible until you test what
 * ships. Every assertion here is one that would have passed on a sandbox that
 * silently rendered nothing.
 */

function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message: ConsoleMessage) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  return errors;
}

/** The sandbox frame for a diagram block, addressed through its mount slot. */
function sandboxFrame(page: Page, index: number) {
  return page.frameLocator("iframe").nth(index);
}

test("diagrams render inside the sandbox", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto("/?doc=multi");

  // Three fixture blocks, three sandboxes. Asserting the count first means a
  // regression that drops one frame fails here rather than as a confusing
  // timeout on a diagram that was never going to appear.
  await expect(page.locator("iframe")).toHaveCount(3);

  const flowchart = sandboxFrame(page, 0).locator("#surface svg");
  await expect(flowchart).toBeVisible({ timeout: 30_000 });
  // Mermaid emitted a real graph, not an empty root: the flowchart fixture has
  // four nodes, so its text must survive into the SVG.
  await expect(sandboxFrame(page, 0).locator("#surface")).toContainText("Renderer UI shell");

  await expect(sandboxFrame(page, 1).locator("#surface svg")).toBeVisible({ timeout: 30_000 });
  await expect(sandboxFrame(page, 2).locator("#surface svg")).toBeVisible({ timeout: 30_000 });

  // A diagram that rendered is not "Rendering diagram" any more. This is the
  // assertion that catches a sandbox which loads but never answers — the
  // placeholder would sit there forever and every other check would still pass.
  await expect(page.getByTestId("preview.diagram-frame.mount-slot").first()).not.toContainText(
    "Rendering",
  );

  expect(errors, "console errors while rendering diagrams").toEqual([]);
});

test("the sandbox is a real security boundary", async ({ page }) => {
  await page.goto("/?doc=multi");
  await expect(sandboxFrame(page, 0).locator("#surface svg")).toBeVisible({ timeout: 30_000 });

  const frame = page.locator("iframe").first();
  // No `allow-same-origin`. With it, the frame would share the app's origin and
  // the sandbox would be decoration — this is the single attribute the whole
  // §12 posture rests on, so it is asserted rather than assumed.
  await expect(frame).toHaveAttribute("sandbox", "allow-scripts");
  // Named for assistive technology; also what keeps axe's frame-title rule
  // quiet on every block.
  await expect(frame).toHaveAttribute("title", /.+/);

  // The frame really is at an opaque origin: reaching into it from the app must
  // throw a cross-origin error rather than return a document.
  const reachable = await page.evaluate(() => {
    const iframe = document.querySelector("iframe");
    try {
      return iframe?.contentDocument !== null && iframe?.contentDocument !== undefined;
    } catch {
      return false;
    }
  });
  expect(reachable, "app could reach into the sandbox document").toBe(false);
});

test("a broken diagram shows a diagnostic, and its neighbours still render", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto("/?doc=broken");

  // SPEC §6: "the renderer never white-screens on a bad block — failed blocks
  // render an inline diagnostic card, healthy blocks still render."
  const card = page.getByTestId("preview.diagram-frame.error-card");
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card).toHaveAttribute("data-severity", "error");
  // Mermaid's own words, wrapped in a translated sentence — not a raw key.
  await expect(card).toContainText("Mermaid could not render this block");

  // The healthy block beside it rendered anyway.
  await expect(sandboxFrame(page, 0).locator("#surface svg")).toBeVisible({ timeout: 30_000 });

  expect(errors, "console errors on a failed render").toEqual([]);
});

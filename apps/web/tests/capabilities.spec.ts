import { test, expect } from "@playwright/test";

/**
 * What this host can do, proved against this host's build.
 *
 * `src/capabilities.ts` supplies `openDocument` and `exportArtifact` and
 * deliberately omits `saveDocument` — a browser cannot write back to the file
 * it was handed. These specs assert that the toolbar offers exactly that and
 * says so where it cannot, which is the claim the shared gates in
 * `packages/shell/tests` cannot make: the two hosts differ on purpose, so an
 * assertion true here is false next door.
 */

const SAVE_UNSUPPORTED = "Save document — this build cannot write files. Export a copy instead";

test("save is offered, disabled, and says why rather than going quiet", async ({ page }) => {
  await page.goto("/?state=multi-idle");
  const save = page.getByTestId("workspace.toolbar.save");

  // Present, not hidden. Hiding it would shift every control after it and
  // change where the toolbar's arrow keys land, so the same keystrokes would
  // mean different things depending on which host you launched.
  await expect(save).toBeVisible();
  await expect(save).toBeDisabled();

  // `multi` is an unsaved document, so the old "No unsaved changes" and the
  // plain "Save document" are both wrong here: nothing about this control
  // depends on the document, because the host cannot save at all.
  await expect(save).toHaveAccessibleName(SAVE_UNSUPPORTED);
});

test("the save reason does not change with the document's state", async ({ page }) => {
  // Whatever the badge says, the control's answer is the same one, because it
  // is the host's answer. A dead control that renames itself as the document
  // changes explains nothing.
  for (const state of ["empty-idle", "failed-idle"]) {
    await page.goto(`/?state=${state}`);
    await expect(page.getByTestId("workspace.toolbar.save")).toHaveAccessibleName(SAVE_UNSUPPORTED);
  }
});

test("export delivers markdown to the host and declines the formats it cannot make", async ({
  page,
}) => {
  await page.goto("/?state=multi-idle");
  await page.getByTestId("workspace.toolbar.export-menu").click();

  // SVG and PNG need the rendered diagram, which lives in a sandboxed iframe at
  // an opaque origin and never comes back — the sandbox protocol returns a size
  // and nothing else. Disabled with a reason that is about the format, not
  // about the host, because supplying a host would not fix it.
  const svg = page.getByTestId("workspace.toolbar.export-svg");
  await expect(svg).toBeDisabled();
  await expect(svg).toHaveAccessibleName("Export all as SVG — not supported yet");

  const png = page.getByTestId("workspace.toolbar.export-png");
  await expect(png).toBeDisabled();
  await expect(png).toHaveAccessibleName("Export all as PNG — not supported yet");

  const markdown = page.getByTestId("workspace.toolbar.export-markdown");
  await expect(markdown).toBeEnabled();
  await expect(markdown).toHaveAccessibleName("Export markdown");

  // The point of the whole change: clicking reaches `exportArtifact`, which on
  // this host is a download. An assertion on the file itself rather than on a
  // spy, so it also proves the payload is the document and not a stub.
  const downloading = page.waitForEvent("download");
  await markdown.click();
  const download = await downloading;

  expect(download.suggestedFilename()).toBe("architecture.md");

  const path = await download.path();
  const { readFile } = await import("node:fs/promises");
  const contents = await readFile(path, "utf8");
  expect(contents).toContain("```mermaid");
  expect(contents.split("\n").length).toBeGreaterThan(5);
});

import { test, expect } from "@playwright/test";

/**
 * What this host can do, proved against this host's build.
 *
 * Today: nothing. `src/main.tsx` supplies an empty `HostCapabilities` because
 * the Electron main/preload bridge does not exist yet, and that emptiness is a
 * legitimate state the contract was built to express — not a gap to paper over
 * with a handler that resolves and does nothing.
 *
 * So these specs pin the other half of #27: with no capability at all, every
 * document action is still *there*, still disabled, and still says why. When
 * the bridge lands and this host starts supplying `saveDocument`, this file is
 * what has to change — which is the point of it living here rather than in the
 * shared gates.
 */

test("every document action is present, disabled, and explains itself", async ({ page }) => {
  await page.goto("/?state=multi-idle");

  const save = page.getByTestId("workspace.toolbar.save");
  await expect(save).toBeVisible();
  await expect(save).toBeDisabled();
  await expect(save).toHaveAccessibleName(
    "Save document — this build cannot write files. Export a copy instead",
  );

  // The menu trigger itself, not its items: with no `exportArtifact` there is
  // nothing to open the menu for, and a menu of three disabled items would
  // make the reader hunt for which one is the problem.
  const exportMenu = page.getByTestId("workspace.toolbar.export-menu");
  await expect(exportMenu).toBeVisible();
  await expect(exportMenu).toBeDisabled();
  await expect(exportMenu).toHaveAccessibleName("Export — this build cannot deliver files");
});

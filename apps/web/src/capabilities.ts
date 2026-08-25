import type { ExportArtifact, HostCapabilities, OpenedDocument } from "@vellum/core";

/**
 * What a browser can do, and nothing more.
 *
 * This is the whole of the web host's logic, and it exists here rather than in
 * the shell because it is the definition of a host: the shell renders controls,
 * the host says which of them can do anything (CLAUDE.md invariant 1).
 */

/**
 * A file picker. The browser hands back the file's *contents* and its *name* —
 * never its location, by design — so `filePath` carries the name too.
 *
 * That is not a placeholder to be improved later. `filePath` exists so a host
 * that has paths can report one; a host that has none reports the most specific
 * thing it knows. Fabricating something path-shaped would be worse than the
 * honest duplicate, because the shell only ever displays it.
 */
const openDocument = (): Promise<OpenedDocument | null> =>
  new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.markdown,.mmd,text/markdown,text/plain";

    // Dismissing the dialog is a legitimate outcome, not a failure — hence
    // `null` in the contract rather than a rejection. `cancel` is the only
    // event that reports it; without this the promise would never settle and
    // whatever awaits it would hang for the life of the page.
    input.addEventListener("cancel", () => resolve(null), { once: true });

    input.addEventListener(
      "change",
      () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        file
          .text()
          .then((text) => resolve({ fileName: file.name, filePath: file.name, text }), reject);
      },
      { once: true },
    );

    input.click();
  });

/**
 * `format` decides the MIME type rather than the file extension, because the
 * extension is the caller's suggestion and this is the part the browser acts
 * on. Exhaustive on purpose: a fourth format added to `ExportArtifact` should
 * fail to compile here rather than silently download as `application/octet-stream`.
 */
const MIME_TYPES: Record<ExportArtifact["format"], string> = {
  svg: "image/svg+xml",
  markdown: "text/markdown",
  png: "image/png",
};

/**
 * A download. The one thing a browser can do with a file it produced.
 *
 * `contents` is a string or a `Uint8Array` depending on `format`, and `Blob`
 * takes either — which is why the discriminated union does not need unpacking
 * here.
 *
 * The object URL is revoked rather than left to the page's lifetime: these are
 * whole rendered diagrams, and a long editing session would otherwise pin every
 * export it ever made in memory. Revoking on the next task rather than
 * immediately, because the download reads the URL after `click()` returns.
 */
const exportArtifact = ({ contents, format, suggestedFileName }: ExportArtifact): Promise<void> => {
  const url = URL.createObjectURL(new Blob([contents], { type: MIME_TYPES[format] }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = suggestedFileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return Promise.resolve();
};

/**
 * Note what is absent: **`saveDocument`**.
 *
 * A browser cannot write back to the file it was given. The File System Access
 * API can, in one engine, behind a second permission prompt and a handle this
 * host would have to keep — and reaching for it would make Save work on Chrome
 * and silently not on Safari and Firefox, which is worse than not offering it.
 *
 * So the member is omitted, and that omission is the first real exercise of the
 * contract from #19: `HostCapabilities` has every member optional precisely so
 * a host can decline one. What the shell does with the absence is #27's
 * question, and this is the case that makes it concrete rather than
 * hypothetical.
 *
 * Also absent, for the same reason: any agent, any watch, any local
 * persistence. Those need a process behind them.
 */
export const webCapabilities: HostCapabilities = {
  openDocument,
  exportArtifact,
};

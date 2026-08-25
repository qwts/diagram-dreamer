import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

/**
 * The sandbox build, shared by every host.
 *
 * A second build producing one file — `dist/sandbox.html` — with Mermaid and
 * the sandbox host inlined into it.
 *
 * Separate from the main build for two reasons that both come back to CSP.
 *
 * *Self-contained*, because the sandbox runs at an opaque origin
 * (`sandbox="allow-scripts"` with no `allow-same-origin`). At an opaque origin
 * `'self'` matches nothing, so a policy cannot name the app's own assets — but
 * it can name a **hash**. One inlined script has one hash, and the document
 * needs no network at all. That is also why code splitting is off: Mermaid
 * lazy-loads its diagram types, and a dynamic import would be a fetch the
 * policy must refuse.
 *
 * *Second*, because that is an output-wide setting and the app bundle wants the
 * opposite — the route splitting stays.
 *
 * Runs after the main build (`emptyOutDir: false`), which would otherwise erase
 * this on its way in.
 *
 * ---
 *
 * Shared rather than copied per host, along with the document and entry it
 * builds, because this *computes a security policy*. Two hand-maintained copies
 * of a hash-pinning build — or of the `default-src 'none'` document it pins —
 * is how one host quietly stops enforcing it. A host contributes nothing here
 * but the `dist` the artifact lands in.
 */

/** Both live in `@vellum/core`, beside the protocol they implement. */
const RENDER_DIR = new URL("../packages/core/src/render/", import.meta.url);
export const SANDBOX_HTML = fileURLToPath(new URL("sandbox.html", RENDER_DIR));
export const SANDBOX_ENTRY = fileURLToPath(new URL("sandbox-entry.ts", RENDER_DIR));

const PLACEHOLDER = "__SANDBOX_SCRIPT_HASH__";

/** The `<script src>` tag the built document replaces with its inlined self. */
export const SANDBOX_SCRIPT_TAG = /<script type="module" src="[^"]*"><\/script>/;

const inlineSandbox = (): Plugin => ({
  name: "vellum-sandbox-inline",
  generateBundle(_options, bundle) {
    const chunk = bundle["sandbox.js"];
    if (!chunk || chunk.type !== "chunk") {
      throw new Error("sandbox build produced no sandbox.js chunk");
    }

    // Vite rewrites dynamic imports through its preload helper and substitutes
    // `__VITE_PRELOAD__` with the chunk's dependency list — but only while
    // generating an HTML entry, which this build has none of. Left in place the
    // sentinel reaches the browser and every first render dies on
    // "__VITE_PRELOAD__ is not defined". With code splitting off there is
    // genuinely nothing to preload, so `void 0` is not a patch over the
    // problem; it is the value Vite itself emits for an empty list.
    const preloaded = chunk.code.replaceAll("__VITE_PRELOAD__", "void 0");

    // `</script` anywhere in the bundle would end the tag early — inside a
    // string, a regex, a comment, it makes no difference to the HTML parser.
    // The escape is inert in every JavaScript context it can land in.
    const code = preloaded.replaceAll("</script", String.raw`<\/script`);
    const hash = createHash("sha256").update(code, "utf8").digest("base64");

    const template = readFileSync(SANDBOX_HTML, "utf8");
    if (!template.includes(PLACEHOLDER)) {
      throw new Error(`sandbox.html no longer contains ${PLACEHOLDER}`);
    }
    if (!SANDBOX_SCRIPT_TAG.test(template)) {
      throw new Error("sandbox.html has no module script tag to replace");
    }

    const html = template
      .replace(PLACEHOLDER, `'sha256-${hash}'`)
      // A function replacement, not a string. A bundle this size is certain to
      // contain `$&` or `$'` somewhere, and String.replace would treat those as
      // substitution patterns and quietly corrupt the script — a failure that
      // would surface as a mystery syntax error inside a sandboxed frame.
      .replace(SANDBOX_SCRIPT_TAG, () => `<script type="module">${code}</script>`);

    // The chunk exists only to be inlined. Leaving it beside the HTML would
    // ship a second, unreferenced copy of Mermaid.
    delete bundle["sandbox.js"];
    this.emitFile({ type: "asset", fileName: "sandbox.html", source: html });
  },
});

/**
 * No `vite-tsconfig-paths` here, unlike the app build. Nothing in the sandbox's
 * module graph uses a path alias — the entry imports one sibling and that
 * imports Mermaid — and the entry now sits outside any host's tsconfig
 * `include`, so the plugin would be resolving against a config that does not
 * describe it.
 */
export const sandboxConfig = () =>
  defineConfig({
    plugins: [inlineSandbox()],
    build: {
      outDir: "dist",
      emptyOutDir: false,
      modulePreload: false,
      // Not `build.lib`: that adds package-style externals and naming. This is
      // an application entry that happens to produce one file.
      rollupOptions: {
        input: SANDBOX_ENTRY,
        output: {
          format: "es",
          entryFileNames: "sandbox.js",
          // One chunk, no exceptions. Mermaid lazy-loads its diagram types, and
          // every dynamic import would become a network fetch the sandbox's own
          // `default-src 'none'` must refuse.
          codeSplitting: false,
        },
      },
    },
  });

/**
 * Build-time pieces every host needs, in one place.
 *
 * Not a package — a plain module both hosts import by relative path. Vite loads
 * its config through esbuild, so this needs no build step, no `exports` map and
 * no lockfile entry to earn its keep.
 *
 * It exists because the alternative is two hand-maintained copies of a
 * *security* policy. The renderer CSP and the sandbox's build-time script hash
 * are the mechanism SPEC §12 describes; a second host with its own drifting
 * copy is how one of them silently stops being enforced. Values a host actually
 * owns — `base`, history, which capabilities it supplies — stay in the host.
 */
import type { Plugin } from "vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

import { SANDBOX_ENTRY, SANDBOX_HTML, SANDBOX_SCRIPT_TAG } from "./vite-sandbox.shared.ts";

/**
 * The shell's source. Both hosts alias `@` here rather than to their own `src`,
 * and both must state it explicitly: `vite-tsconfig-paths` resolves from the
 * Vite root and never reaches a sibling package, so a missing alias surfaces as
 * a wall of unresolved imports instead of one clear error.
 */
export const SHELL_SRC = fileURLToPath(new URL("../packages/shell/src", import.meta.url));

/**
 * Renderer CSP per SPEC §12 — no remote origins at all, because the app ships
 * offline with its fonts and translations bundled.
 *
 * `blob:` on img and frame is what lets the sandboxed Mermaid iframe and PNG
 * export work. `data:` on font is required rather than lax: Vite inlines font
 * files under the 4 KiB asset limit as `data:` URIs, so `font-src 'self'` alone
 * blocks them and the packaged build silently falls back to system fonts.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

/**
 * Injects the CSP into built HTML only. The dev server needs inline module
 * preambles and a websocket for HMR, and what actually ships is the surface
 * worth locking down.
 */
export const cspPlugin = (): Plugin => ({
  name: "vellum-csp",
  transformIndexHtml: {
    order: "post",
    handler(html, ctx) {
      if (!ctx.bundle) return html; // dev server: leave HMR alone
      // sandbox.html carries its own policy and is built separately; the
      // renderer's CSP would be wrong for it.
      if (ctx.path.endsWith("sandbox.html")) return html;
      return html.replace(
        "</head>",
        `  <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n  </head>`,
      );
    },
  },
});

/**
 * Dev only. `sandbox.html` ships with a placeholder where its script hash goes,
 * filled in by the separate sandbox build. Served raw by the dev server, that
 * placeholder is an unparseable source expression, and the browser responds by
 * blocking every script in the frame — a sandbox that silently renders nothing.
 *
 * Strip the policy in dev rather than fake it. The frame is still opaque-origin
 * and still cannot reach the app; what it loses is the network lockdown, and
 * the honest reason is that under the dev server the sandbox's script *is* a
 * network fetch. Neither this nor the CSP above applies to anything that ships.
 */
export const devSandboxCspPlugin = (): Plugin => ({
  name: "vellum-sandbox-dev-csp",
  apply: "serve",
  transformIndexHtml: {
    order: "pre",
    handler(html, ctx) {
      if (!ctx.path.endsWith("sandbox.html")) return html;
      return html.replace(/\s*<meta\s+http-equiv="Content-Security-Policy"[^>]*>/, "");
    },
  },
});

/**
 * Dev only, and the counterpart to the sandbox build: it serves the same
 * `sandbox.html` the build inlines, straight from `@vellum/core`.
 *
 * The document sits outside every host's Vite root by design — one copy of a
 * `default-src 'none'` policy, not one per host — so the static middleware will
 * never find it and `/sandbox.html` would 404 under `vite dev`. Registered
 * ahead of Vite's own HTML handling rather than after it, which is what taking
 * `server` directly gets us.
 *
 * The `src` is rewritten to an `/@fs/` path for the same reason: the entry is
 * outside the root too, and that is the only way the dev server will serve it.
 * Nothing here touches the built output, where both are inlined and the tag is
 * gone.
 */
export const sandboxDevServePlugin = (): Plugin => ({
  name: "vellum-sandbox-dev-serve",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const path = req.url?.split("?")[0];
      if (path !== "/sandbox.html") return next();

      const html = readFileSync(SANDBOX_HTML, "utf8").replace(
        SANDBOX_SCRIPT_TAG,
        `<script type="module" src="/@fs${SANDBOX_ENTRY}"></script>`,
      );

      // Runs the transformIndexHtml chain, which is what strips the
      // unfillable hash placeholder below and injects the HMR client.
      server
        .transformIndexHtml(path, html, req.originalUrl)
        .then((transformed) => {
          res.setHeader("Content-Type", "text/html");
          res.end(transformed);
        })
        .catch(next);
    });
  },
});

/**
 * The routes live in the shell, not in any host. The plugin has to be told so
 * explicitly — its defaults assume routes sit under the Vite root, and a host
 * that owns no routes is exactly the arrangement that makes a second host
 * possible.
 */
export const shellRouterPlugin = () =>
  tanstackRouter({
    target: "react",
    autoCodeSplitting: true,
    routesDirectory: SHELL_SRC + "/routes",
    generatedRouteTree: SHELL_SRC + "/routeTree.gen.ts",
  });

/**
 * Dev-server CORS, and required for the diagram sandbox to work at all.
 *
 * The sandbox frame runs at an opaque origin, so it sends `Origin: null`.
 * Module scripts are always fetched with CORS and Vite answers with its own
 * origin rather than a wildcard — so under `vite dev` every diagram fails with
 * "Diagram sandbox failed to start" while the built app is fine. Nothing in the
 * gates catches it, because the gates test the build.
 *
 * Deliberately not `cors: true` / `origin: "*"`, which would let any page on the
 * internet read this dev server's source. `"null"` is the one extra origin the
 * sandbox needs; the loopback pattern preserves Vite's behaviour for the rest.
 */
/**
 * The one entry the dev-server dependency scan should follow.
 *
 * Left to itself the scanner globs every `*.html` under the Vite root, which
 * includes build output. `dist` is excluded because it is the configured
 * `outDir`; `dist-pseudo` is not, because the pseudo build passes `--outDir` on
 * the command line. So the scanner reaches `dist-pseudo/sandbox.html` — three
 * megabytes of already-bundled Mermaid inlined into a `<script>` — fails to
 * parse it, and gives up on pre-bundling for the whole session with a wall of
 * errors that name a file nobody edited.
 *
 * Naming the entry is the fix rather than adding an exclude, because there is
 * genuinely only one: a host is an `index.html` and a `main.tsx`.
 */
export const devScanEntries = ["index.html"];

export const devServerCors = {
  origin: [/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/, "null"] as (string | RegExp)[],
};

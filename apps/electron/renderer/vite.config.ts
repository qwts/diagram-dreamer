import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// Renderer CSP per SPEC §12. Injected into the built HTML only: Vite's dev
// server needs inline module preambles and a websocket for HMR, and the packaged
// renderer is the surface that actually needs locking down.
//   - no remote origins at all; the app ships offline (fonts and i18n are bundled)
//   - blob: for img/frame so the future sandboxed Mermaid iframe and PNG export work
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  // data: is required, not lax: Vite inlines font files under the 4 KiB asset
  // limit as data: URIs, so `font-src 'self'` alone blocks them and the app
  // silently falls back to system fonts in the packaged build. Caught by the
  // Playwright console-error gate. Still no remote origin is permitted.
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

const cspPlugin = (): Plugin => ({
  name: "vellum-csp",
  transformIndexHtml: {
    order: "post",
    handler(html, ctx) {
      if (!ctx.bundle) return html; // dev server: leave HMR alone
      // sandbox.html carries its own policy and is built by
      // vite.sandbox.config.ts; the renderer's CSP would be wrong for it.
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
 * filled in by the separate sandbox build; served raw by the dev server, that
 * placeholder is an unparseable source expression and the browser falls back to
 * blocking every script in the frame — a sandbox that silently renders nothing.
 *
 * Strip the policy in dev rather than fake it. The frame is still opaque-origin
 * and still cannot reach the app; what it loses is the network lockdown, and
 * the honest reason is that under the dev server the sandbox's script *is* a
 * network fetch. Same trade the renderer's own CSP already makes above, for the
 * same reason, and neither applies to anything that ships.
 */
const devSandboxCspPlugin = (): Plugin => ({
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

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    cspPlugin(),
    devSandboxCspPlugin(),
  ],
  // Relative base so the bundle loads from file:// in the Electron shell.
  base: "./",
  server: {
    /**
     * Dev only, and required for the diagram sandbox to work at all.
     *
     * The sandbox frame runs at an opaque origin, so it sends `Origin: null`.
     * Module scripts are always fetched with CORS, and Vite answers with its own
     * origin rather than a wildcard — so under `vite dev` every diagram fails
     * with "Diagram sandbox failed to start" while the built app is fine.
     * Nothing in the gates catches it, because the gates test the build.
     *
     * Deliberately not `cors: true` / `origin: "*"`, which would let any page on
     * the internet read this dev server's source. `"null"` is the one extra
     * origin the sandbox needs; the loopback pattern preserves Vite's own
     * behaviour for everything else.
     */
    cors: {
      origin: [/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/, "null"],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});

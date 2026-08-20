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
  "font-src 'self'",
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
      return html.replace(
        "</head>",
        `  <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n  </head>`,
      );
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
  ],
  // Relative base so the bundle loads from file:// in the Electron shell.
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});

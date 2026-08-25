import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

import {
  SHELL_SRC,
  cspPlugin,
  devSandboxCspPlugin,
  devScanEntries,
  devServerCors,
  sandboxDevServePlugin,
  shellRouterPlugin,
} from "../vite-host.shared.ts";

export default defineConfig({
  resolve: { alias: { "@": SHELL_SRC } },
  plugins: [
    shellRouterPlugin(),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    cspPlugin(),
    sandboxDevServePlugin(),
    devSandboxCspPlugin(),
  ],
  /**
   * Absolute, and the one line here that differs from `apps/desktop`. This host
   * is served over http from a document root, where "/" is a real prefix;
   * desktop uses "./" because Electron loads its build with `loadFile` and every
   * absolute path would resolve against the filesystem root.
   */
  base: "/",
  server: { cors: devServerCors },
  optimizeDeps: { entries: devScanEntries },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});

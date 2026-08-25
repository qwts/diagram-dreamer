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
   * Relative, and the one line in this file that is genuinely desktop-specific.
   * Electron loads the built renderer with `loadFile`, so every absolute asset
   * path would resolve against the filesystem root. `apps/web` is served over
   * http and uses "/".
   */
  base: "./",
  server: { cors: devServerCors },
  optimizeDeps: { entries: devScanEntries },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});

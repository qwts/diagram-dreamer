import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Build output and generated files. Without these, `eslint .` walks the
    // minified bundles in dist/ and dist-pseudo/ and reports prettier
    // violations against generated code.
    ignores: [
      "dist",
      "dist-pseudo",
      ".output",
      ".vinxi",
      ".lovable",
      "test-results",
      "playwright-report",
      "src/routeTree.gen.ts",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // CLAUDE.md invariant 2: this ships in Electron; there is no server.
      // These are the imports through which SSR would come back.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message: "The renderer is a static SPA — there is no server module graph to split.",
            },
          ],
          patterns: [
            {
              group: ["@tanstack/react-start", "@tanstack/react-start/*", "@tanstack/start*"],
              message:
                "TanStack Start was removed in M1 (CLAUDE.md invariant 2). The renderer is a plain Vite SPA with a memory-history router.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  eslintPluginPrettier,
);

/**
 * CI gate: every Vellum token pair that carries text must meet WCAG 2.1 AA,
 * in both themes (SPEC §9, "Contrast enforced at the token level").
 *
 * Also verifies that src/styles.css still matches DESIGN.md, which
 * `@vellum/design-tokens` reads. That is the half of SPEC §9 that matters: the
 * stylesheet cannot drift from the document without failing the build.
 *
 * Run: npm run check:contrast
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { contrast, LIGHT, DARK, PAIRS } from "./contrast.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(here, "../src/styles.css"), "utf8");

/** Pull `--name: #value;` pairs out of a `:root {}` or `.dark {}` block. */
function readBlock(selector) {
  const match = css.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`Could not find ${selector} block in styles.css`);
  const values = {};
  for (const [, name, value] of match[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    values[name] = value.toLowerCase();
  }
  return values;
}

let drift = 0;
for (const [themeName, selector, tokens] of [
  ["light", ":root", LIGHT],
  ["dark", "\\.dark", DARK],
]) {
  const fromCss = readBlock(selector);
  for (const [name, value] of Object.entries(tokens)) {
    if (fromCss[name] !== value) {
      drift += 1;
      console.error(
        `  DRIFT  ${themeName} --${name}: styles.css has ${fromCss[name] ?? "(missing)"}, DESIGN.md has ${value}`,
      );
    }
  }
}
if (drift > 0) {
  console.error(`\n${drift} token(s) out of sync with src/styles.css.\n`);
  process.exit(1);
}

let failed = 0;
for (const [themeName, tokens] of [
  ["light", LIGHT],
  ["dark", DARK],
]) {
  console.log(`\n${themeName.toUpperCase()}`);
  for (const [label, fg, bg, need] of PAIRS) {
    const ratio = contrast(tokens[fg], tokens[bg]);
    const ok = ratio >= need;
    if (!ok) failed += 1;
    console.log(
      `  ${ok ? "pass" : "FAIL"}  ${ratio.toFixed(2).padStart(6)}:1  (min ${need})  ${label}`,
    );
  }
}

console.log(
  failed === 0
    ? "\nAll token pairs meet WCAG 2.1 AA; DESIGN.md and src/styles.css agree.\n"
    : `\n${failed} pair(s) below threshold.\n`,
);
process.exit(failed === 0 ? 0 : 1);

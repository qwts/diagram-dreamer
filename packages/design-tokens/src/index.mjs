/**
 * DESIGN.md is the source of the palette. This package reads it.
 *
 * SPEC §9 puts `packages/design-tokens` between DESIGN.md and everything that
 * consumes tokens, so no consumer keeps its own copy. Before this existed the
 * contrast gate compared `styles.css` against a table hand-maintained in
 * `scripts/contrast.mjs` — which caught drift between those two files while
 * leaving both free to drift from DESIGN.md, the document that is supposed to
 * be authoritative.
 *
 * ---
 *
 * **Why this parses DESIGN.md rather than running the official exporter.**
 * SPEC §9 (and audit finding L2) name `design.md export --format css-tailwind`
 * as the mechanism. Its v0.4.0 output is lossy for this design system: it emits
 * no line-height at all, though DESIGN.md declares one for all six type styles,
 * and it emits `--font-<style>: "Inter"` per style rather than the fallback
 * stacks the shell needs. Adopting it wholesale would flatten the type scale.
 * Verified by running it; recorded in docs/AUDIT.md.
 *
 * So DESIGN.md stays the source and this reads it directly. The official
 * `lint` gate still runs in CI, so the document's structure is still validated
 * by the tool that owns the format.
 *
 * Deliberately no YAML dependency. The `colors:` block is a flat map of
 * `name: "#hex"`; a parser for exactly that is a dozen lines and cannot
 * misinterpret anything else in the file. If this ever needs the nested
 * `typography:` or `components:` blocks, take the dependency then.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

/** Repo-root DESIGN.md. This package sits at packages/design-tokens/src. */
export const DESIGN_MD = resolve(here, "../../../DESIGN.md");

/**
 * Two names differ between DESIGN.md and the stylesheet, and deliberately so:
 * DESIGN.md names the *role in the palette*, the stylesheet names the *role on
 * screen*. Kept as an explicit map rather than a rename in either file, so
 * neither has to adopt the other's vocabulary.
 */
const CSS_NAME = { primary: "foreground", neutral: "background" };

/** Parse the flat `colors:` block out of the DESIGN.md frontmatter. */
function readColors(markdown) {
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) throw new Error("DESIGN.md has no frontmatter block");

  const block = frontmatter[1].match(/^colors:\r?\n((?:[ \t]+.*\r?\n?)*)/m);
  if (!block) throw new Error("DESIGN.md frontmatter has no colors: block");

  const colors = {};
  for (const [, name, value] of block[1].matchAll(
    /^[ \t]+([\w-]+):[ \t]*"?(#[0-9a-fA-F]{3,8})"?[ \t]*$/gm,
  )) {
    colors[name] = value.toLowerCase();
  }
  if (Object.keys(colors).length === 0) throw new Error("DESIGN.md colors: block parsed empty");
  return colors;
}

const colors = readColors(readFileSync(DESIGN_MD, "utf8"));

/**
 * Split into themes. DESIGN.md carries the dark palette as `<name>-dark`
 * siblings; the stylesheet carries them as the same names inside `.dark`.
 */
function theme(wantDark) {
  const out = {};
  for (const [name, value] of Object.entries(colors)) {
    const isDark = name.endsWith("-dark");
    if (isDark !== wantDark) continue;
    const base = isDark ? name.slice(0, -"-dark".length) : name;
    out[CSS_NAME[base] ?? base] = value;
  }
  return out;
}

/** Light palette, keyed by the custom-property name used in `:root`. */
export const LIGHT = theme(false);

/** Dark palette, keyed by the custom-property name used in `.dark`. */
export const DARK = theme(true);

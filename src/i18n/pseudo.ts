/**
 * Pseudo-localization (SPEC §9: "Pseudo-localization build target to catch
 * truncation/concatenation in CI").
 *
 * Three properties, each catching a different class of bug:
 *   - accented characters   → text that bypassed i18next stays plain ASCII
 *   - ~35% expansion        → layouts that only fit English clip or overflow
 *   - bracket delimiters    → a concatenated string shows its seam: [[a]][[b]]
 *
 * ICU argument placeholders and the tags inside plural forms are left intact,
 * or the messages would stop parsing.
 */
const MAP: Record<string, string> = {
  a: "á",
  b: "b́",
  c: "ć",
  d: "d́",
  e: "é",
  f: "f́",
  g: "ǵ",
  h: "h́",
  i: "í",
  j: "j́",
  k: "ḱ",
  l: "ĺ",
  m: "ḿ",
  n: "ń",
  o: "ó",
  p: "ṕ",
  q: "q́",
  r: "ŕ",
  s: "ś",
  t: "t́",
  u: "ú",
  v: "v́",
  w: "ẃ",
  x: "x́",
  y: "ý",
  z: "ź",
  A: "Á",
  B: "B́",
  C: "Ć",
  D: "D́",
  E: "É",
  F: "F́",
  G: "Ǵ",
  H: "H́",
  I: "Í",
  J: "J́",
  K: "Ḱ",
  L: "Ĺ",
  M: "Ḿ",
  N: "Ń",
  O: "Ó",
  P: "Ṕ",
  Q: "Q́",
  R: "Ŕ",
  S: "Ś",
  T: "T́",
  U: "Ú",
  V: "V́",
  W: "Ẃ",
  X: "X́",
  Y: "Ý",
  Z: "Ź",
};

const PAD = "·";

/** Segments that ICU owns and we must not touch. */
const PROTECTED = /(\{[^{}]*\}|<[^<>]*>)/g;

function pseudoSegment(text: string): string {
  return text.replace(/[A-Za-z]/g, (char) => MAP[char] ?? char);
}

export function pseudoString(value: string): string {
  const transformed = value
    .split(PROTECTED)
    .map((part, index) => (index % 2 === 1 ? part : pseudoSegment(part)))
    .join("");

  // Expand by roughly a third, the usual worst case for en → de/fi.
  const letters = value.replace(PROTECTED, "").replace(/[^A-Za-z]/g, "").length;
  const padding = PAD.repeat(Math.max(1, Math.ceil(letters * 0.35)));
  return `⟦${transformed}${padding}⟧`;
}

/** Deep-maps a resource bundle, leaving structure and keys untouched. */
export function pseudoBundle<T>(bundle: T): T {
  if (typeof bundle === "string") return pseudoString(bundle) as unknown as T;
  if (Array.isArray(bundle)) return bundle.map(pseudoBundle) as unknown as T;
  if (bundle && typeof bundle === "object") {
    return Object.fromEntries(
      Object.entries(bundle as Record<string, unknown>).map(([key, value]) => [
        key,
        pseudoBundle(value),
      ]),
    ) as T;
  }
  return bundle;
}

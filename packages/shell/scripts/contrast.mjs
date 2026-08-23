/**
 * WCAG contrast helper and the list of token pairs that must clear a threshold.
 * Pure module — no side effects. The CI gate lives in scripts/check-contrast.mjs.
 *
 * The palette itself is no longer here. `@vellum/design-tokens` reads it from
 * DESIGN.md (SPEC §9), and this module re-exports it so existing importers keep
 * working. Two hand-maintained copies of seventeen hex values used to sit in
 * this file; the gate compared them against styles.css, which caught drift
 * between those two files while leaving both free to drift from the document
 * that is supposed to be authoritative.
 */
export { LIGHT, DARK } from "@vellum/design-tokens";
const hex = (h) => {
  const s = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const lin = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const luminance = (h) => {
  const [r, g, b] = hex(h).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (a, b) => {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

/** [label, foreground token, background token, minimum ratio] */
export const PAIRS = [
  ["body text on paper", "foreground", "background", 4.5],
  ["body text on raised surface", "foreground", "surface-raised", 4.5],
  ["slate on paper", "secondary", "background", 4.5],
  ["slate on raised surface", "secondary", "surface-raised", 4.5],
  ["slate on muted", "secondary", "muted", 4.5],
  ["lagoon on paper", "tertiary", "background", 4.5],
  ["lagoon on raised surface", "tertiary", "surface-raised", 4.5],
  ["lagoon on lagoon surface", "tertiary", "tertiary-surface", 4.5],
  ["on-lagoon on lagoon", "on-tertiary", "tertiary", 4.5],
  ["on-lagoon on lagoon hover", "on-tertiary", "tertiary-hover", 4.5],
  ["danger on danger surface", "danger", "danger-surface", 4.5],
  ["danger on raised surface", "danger", "surface-raised", 4.5],
  ["warning on warning surface", "warning", "warning-surface", 4.5],
  ["warning on raised surface", "warning", "surface-raised", 4.5],
  ["success on success surface", "success", "success-surface", 4.5],
  ["success on raised surface", "success", "surface-raised", 4.5],
  // Non-text UI indicators: WCAG 1.4.11 threshold. The soft `border` is a
  // decorative divider and is deliberately not checked; `border-strong` is the
  // one that identifies a control (secondary button, inputs) and must clear 3:1.
  ["focus ring vs paper", "tertiary", "background", 3],
  ["focus ring vs raised surface", "tertiary", "surface-raised", 3],
  ["control border vs paper", "border-strong", "background", 3],
  ["control border vs raised surface", "border-strong", "surface-raised", 3],
];

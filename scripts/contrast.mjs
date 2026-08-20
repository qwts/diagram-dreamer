/**
 * Vellum token values and a WCAG contrast helper. Pure module — no side effects.
 * The CI gate lives in scripts/check-contrast.mjs.
 *
 * These values mirror src/styles.css. SPEC §9 has packages/design-tokens
 * generating both from DESIGN.md; until that exists, check-contrast.mjs
 * verifies they stay in sync with the stylesheet.
 */
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

export const LIGHT = {
  foreground: "#16181a",
  secondary: "#5c6470",
  tertiary: "#0e7c7b",
  "tertiary-hover": "#0b6362",
  "tertiary-surface": "#f0f7f6",
  "on-tertiary": "#ffffff",
  background: "#fafaf8",
  "surface-raised": "#ffffff",
  muted: "#f2f1ed",
  border: "#e3e1dc",
  "border-strong": "#8d887c",
  danger: "#b3261e",
  "danger-surface": "#fbeae9",
  warning: "#8a5a00",
  "warning-surface": "#fdf3e0",
  success: "#1e7b34",
  "success-surface": "#e9f2eb",
};

export const DARK = {
  foreground: "#e8e6e1",
  secondary: "#9ba3ad",
  tertiary: "#3fbdb8",
  "tertiary-hover": "#58cdc8",
  "tertiary-surface": "#17302f",
  "on-tertiary": "#0b1416",
  background: "#141619",
  "surface-raised": "#1d2024",
  muted: "#23272c",
  border: "#2a2e33",
  "border-strong": "#6a717d",
  danger: "#f2b8b5",
  "danger-surface": "#38211f",
  warning: "#e0a949",
  "warning-surface": "#33280f",
  success: "#6cd48a",
  "success-surface": "#25322e",
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

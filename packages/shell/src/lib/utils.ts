import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge has to be taught the Vellum theme.
 *
 * Both our type scale and our colour scale live under `text-*`
 * (`text-body-sm`, `text-ink`). Out of the box tailwind-merge only recognises
 * Tailwind's own keys, so it cannot tell which of two custom `text-*` classes
 * is a size and which is a colour — it treats them as conflicting and keeps
 * only the last. That silently dropped the primary button's `text-on-lagoon`
 * (leaving ink on Lagoon, an AA contrast failure) and every StatusPill's
 * `text-body-sm` (leaving them at the inherited 15px). Both were present from
 * the Lovable output and were only caught once axe ran over the fixtures.
 *
 * Listing the theme keys in the right groups restores the distinction.
 */
const TYPE_SCALE = ["h1", "h2", "body-md", "body-sm", "code", "label-caps"];

const COLORS = [
  "ink",
  "slate",
  "lagoon",
  "lagoon-hover",
  "lagoon-surface",
  "on-lagoon",
  "paper",
  "surface-raised",
  "muted",
  "border-strong",
  "danger",
  "danger-surface",
  "warning",
  "warning-surface",
  "success",
  "success-surface",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: TYPE_SCALE }],
      "text-color": [{ text: COLORS }],
      "bg-color": [{ bg: COLORS }],
      "border-color": [{ border: COLORS }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

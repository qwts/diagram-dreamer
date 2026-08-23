import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

/**
 * CodeMirror's look, expressed entirely in Vellum tokens.
 *
 * Every value here is a `var(--…)` reference, never a literal — invariant 3.
 * That is also why there is no separate dark theme: the tokens themselves flip
 * under `.dark`, so one stylesheet serves both and the two can never drift.
 * A hand-written dark variant would be a second place to forget a colour.
 */
export const vellumEditorTheme = EditorView.theme({
  "&": {
    height: "100%",
    color: "var(--color-ink)",
    backgroundColor: "var(--color-paper)",
    fontSize: "var(--text-code)",
  },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    lineHeight: "var(--text-code--line-height)",
  },
  ".cm-content": {
    caretColor: "var(--color-ink)",
    paddingBlock: "var(--spacing-sm)",
    paddingInline: "var(--spacing-md)",
  },

  // The focus ring the a11y contract requires: 2px tertiary, 2px offset. It
  // goes on the scroller rather than the content, because the content box is
  // the full scroll height and an outline on it would be drawn off-screen.
  "&.cm-focused": { outline: "none" },
  "&.cm-focused .cm-scroller": {
    outline: "2px solid var(--color-lagoon)",
    outlineOffset: "-2px",
  },

  "&.cm-focused .cm-cursor": { borderInlineStartColor: "var(--color-ink)" },
  ".cm-selectionBackground, ::selection": { backgroundColor: "var(--color-lagoon-surface)" },
  "&.cm-focused .cm-selectionBackground": { backgroundColor: "var(--color-lagoon-surface)" },
  ".cm-activeLine": { backgroundColor: "var(--color-muted)" },

  ".cm-gutters": {
    backgroundColor: "var(--color-surface-raised)",
    color: "var(--color-slate)",
    borderInlineEnd: "1px solid var(--color-border)",
    paddingBlock: "var(--spacing-sm)",
  },
  ".cm-activeLineGutter": { backgroundColor: "var(--color-muted)" },

  // Diagnostics. Colour alone never carries the signal (invariant 7): the two
  // severities differ in stroke style as well as hue, and the gutter badge
  // beside them differs in shape.
  ".cm-lintRange-error": {
    textDecoration: "underline wavy var(--color-danger)",
    textDecorationSkipInk: "none",
    backgroundImage: "none",
  },
  ".cm-lintRange-warning": {
    textDecoration: "underline dotted var(--color-warning)",
    textDecorationSkipInk: "none",
    backgroundImage: "none",
  },

  ".cm-tooltip": {
    backgroundColor: "var(--color-surface-raised)",
    color: "var(--color-ink)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-control)",
  },
  ".cm-panels": {
    backgroundColor: "var(--color-surface-raised)",
    color: "var(--color-ink)",
  },
});

/**
 * Markdown syntax colours. Restrained on purpose: DESIGN.md treats the editor
 * as a document surface, so structure is shown through weight and the slate
 * secondary, and Lagoon stays out of it — it marks interactive and live
 * elements, and a heading is neither.
 */
export const vellumHighlightStyle = HighlightStyle.define([
  { tag: tags.heading, color: "var(--color-ink)", fontWeight: "650" },
  { tag: tags.strong, fontWeight: "650" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.link, color: "var(--color-lagoon)", textDecoration: "underline" },
  { tag: tags.monospace, color: "var(--color-ink)" },
  { tag: tags.processingInstruction, color: "var(--color-slate)" },
  { tag: tags.comment, color: "var(--color-slate)", fontStyle: "italic" },
  { tag: tags.contentSeparator, color: "var(--color-slate)" },
  { tag: tags.list, color: "var(--color-slate)" },
  { tag: tags.quote, color: "var(--color-slate)", fontStyle: "italic" },
  { tag: tags.keyword, color: "var(--color-ink)", fontWeight: "650" },
  { tag: tags.string, color: "var(--color-ink)" },
]);

export const vellumSyntaxHighlighting = syntaxHighlighting(vellumHighlightStyle);

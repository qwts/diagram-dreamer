import { StateEffect, StateField } from "@codemirror/state";
import { GutterMarker, ViewPlugin, gutter, type EditorView } from "@codemirror/view";
import { testIds } from "@/testids";
import type { Diagnostic } from "@/types/shell";

/** Severity per 1-based document line, or nothing if the line is clean. */
export type SeverityByLine = ReadonlyMap<number, Diagnostic["severity"]>;

export const setGutterDiagnostics = StateEffect.define<SeverityByLine>();

/**
 * Diagnostics live in editor state rather than in a closure so the gutter
 * redraws through CodeMirror's own update cycle. A marker that read a React
 * variable would keep rendering last render's diagnostics until something else
 * happened to invalidate the gutter.
 */
export const gutterDiagnostics = StateField.define<SeverityByLine>({
  create: () => new Map(),
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setGutterDiagnostics)) return effect.value;
    }
    return value;
  },
});

const SVG = "http://www.w3.org/2000/svg";

function svg(...children: [tag: string, attrs: Record<string, string>][]): SVGSVGElement {
  const root = document.createElementNS(SVG, "svg");
  root.setAttribute("viewBox", "0 0 24 24");
  root.setAttribute("fill", "none");
  root.setAttribute("stroke", "currentColor");
  root.setAttribute("stroke-width", "2");
  root.setAttribute("stroke-linecap", "round");
  root.setAttribute("stroke-linejoin", "round");
  root.setAttribute("width", "14");
  root.setAttribute("height", "14");
  root.setAttribute("aria-hidden", "true");
  for (const [tag, attrs] of children) {
    const node = document.createElementNS(SVG, tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    root.append(node);
  }
  return root;
}

/**
 * Severity is carried by outline shape as well as colour — a circle for an
 * error, a triangle for a warning — so the distinction survives a monochrome
 * display or a red/green deficiency (invariant 7).
 */
const badgeShape = (severity: Diagnostic["severity"]): SVGSVGElement =>
  severity === "error"
    ? svg(
        ["circle", { cx: "12", cy: "12", r: "10" }],
        ["line", { x1: "12", y1: "8", x2: "12", y2: "12" }],
        ["line", { x1: "12", y1: "16", x2: "12.01", y2: "16" }],
      )
    : svg(
        [
          "path",
          {
            d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
          },
        ],
        ["line", { x1: "12", y1: "9", x2: "12", y2: "13" }],
        ["line", { x1: "12", y1: "17", x2: "12.01", y2: "17" }],
      );

class LineMarker extends GutterMarker {
  constructor(
    private readonly line: number,
    private readonly severity: Diagnostic["severity"] | undefined,
    private readonly label: string | undefined,
  ) {
    super();
  }

  override eq(other: LineMarker): boolean {
    return (
      this.line === other.line && this.severity === other.severity && this.label === other.label
    );
  }

  override toDOM(): Node {
    const row = document.createElement("span");
    row.dataset["testid"] = testIds.editor.gutterLine;
    row.className = "flex items-center justify-end gap-xs ps-sm pe-xs";

    if (this.severity && this.label) {
      const badge = document.createElement("span");
      // role="img" so the label is permitted: a bare <span> maps to role
      // generic, which prohibits aria-label (axe aria-prohibited-attr).
      badge.setAttribute("role", "img");
      badge.setAttribute("aria-label", this.label);
      badge.setAttribute("title", this.label);
      badge.dataset["testid"] = testIds.editor.errorBadge;
      badge.className = `flex items-center ${
        this.severity === "error" ? "text-danger" : "text-warning"
      }`;
      badge.append(badgeShape(this.severity));
      row.append(badge);
    } else {
      const spacer = document.createElement("span");
      spacer.className = "size-3.5";
      spacer.setAttribute("aria-hidden", "true");
      row.append(spacer);
    }

    const number = document.createElement("span");
    number.className = "tabular-nums";
    number.textContent = String(this.line);
    row.append(number);
    return row;
  }
}

interface GutterOptions {
  /** Already translated: `t("editor.gutter.errorBadge", { line })`. */
  badgeLabel: (severity: Diagnostic["severity"], line: number) => string;
}

/**
 * One gutter carrying both the line number and its diagnostic badge.
 *
 * Two stacked gutters would be the more obvious composition and the wrong one:
 * the badge and the number belong to the same row, and splitting them lets a
 * future layout change slide one out of alignment with the other.
 */
const GUTTER_CLASS = "cm-vellum-gutter";

/**
 * CodeMirror builds the gutter element itself, so the test id has to be put on
 * it afterwards rather than written into markup. Re-applied on update because
 * a reconfiguration can rebuild the gutter, and a test id that survives only
 * the first render is worse than none — it passes locally and fails on a state
 * that happens to reconfigure.
 */
const tagGutter = ViewPlugin.fromClass(
  class {
    constructor(view: EditorView) {
      this.tag(view);
    }
    update(update: { view: EditorView }) {
      this.tag(update.view);
    }
    tag(view: EditorView) {
      const element = view.dom.querySelector(`.${GUTTER_CLASS}`);
      if (element && !element.hasAttribute("data-testid")) {
        element.setAttribute("data-testid", testIds.editor.gutter);
      }
    }
  },
);

export function diagnosticGutter({ badgeLabel }: GutterOptions) {
  return [
    gutterDiagnostics,
    tagGutter,
    gutter({
      class: `${GUTTER_CLASS} select-none text-end`,
      lineMarker: (view, block) => {
        const line = view.state.doc.lineAt(block.from).number;
        const severity = view.state.field(gutterDiagnostics).get(line);
        return new LineMarker(line, severity, severity ? badgeLabel(severity, line) : undefined);
      },
      // Without a spacer the gutter resizes as you scroll past line 100, which
      // shifts the whole document sideways mid-scroll.
      initialSpacer: () => new LineMarker(9999, undefined, undefined),
      lineMarkerChange: (update) =>
        update.transactions.some((transaction) =>
          transaction.effects.some((effect) => effect.is(setGutterDiagnostics)),
        ),
    }),
  ];
}

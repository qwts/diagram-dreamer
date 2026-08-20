import { useCallback, useEffect, useRef, useState } from "react";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  keymap,
  placeholder,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { bracketMatching, indentOnInput } from "@codemirror/language";
import { markdown } from "@codemirror/lang-markdown";
import { setDiagnostics } from "@codemirror/lint";
import { diagnosticGutter, setGutterDiagnostics } from "./gutter";
import { vellumEditorTheme, vellumSyntaxHighlighting } from "./theme";
import type { Diagnostic } from "@/types/shell";

/** A diagnostic with its message already translated by the calling component. */
export interface EditorDiagnostic {
  line: number;
  severity: Diagnostic["severity"];
  message: string;
}

export interface Cursor {
  line: number;
  column: number;
}

interface Options {
  value: string;
  /**
   * Changes when the *document* changes, not when its text does. The editor is
   * uncontrolled between two documents: pushing `value` back in on every change
   * would fight the user, because the preview settles on a delay and the text
   * arriving here is then older than what they have already typed.
   */
  syncKey: string;
  diagnostics: readonly EditorDiagnostic[];
  wrap: boolean;
  /** Where the caret starts, so the status bar and the editor agree on load. */
  initialCursor?: Cursor | undefined;
  ariaLabel: string;
  placeholder: string;
  badgeLabel: (severity: Diagnostic["severity"], line: number) => string;
  onChange: (value: string) => void;
  onCursorChange: (cursor: Cursor) => void;
}

const localisedExtensions = (ariaLabel: string, hint: string): Extension => [
  EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
  placeholder(hint),
];

function offsetOf(state: EditorState, cursor: Cursor | undefined): number {
  if (!cursor) return 0;
  const line = state.doc.line(Math.min(Math.max(cursor.line, 1), state.doc.lines));
  return Math.min(line.from + Math.max(cursor.column - 1, 0), line.to);
}

/** Line range for a 1-based document line, clamped to a document that shrank. */
function rangeOf(state: EditorState, line: number): { from: number; to: number } {
  const target = state.doc.line(Math.min(Math.max(line, 1), state.doc.lines));
  return { from: target.from, to: target.to };
}

/**
 * A CodeMirror 6 instance, owned by React but not rendered by it.
 *
 * CodeMirror manages its own DOM, so React's job here is narrow: create the
 * view when a container appears, push prop changes in as transactions, and tear
 * it down. Everything that changes often — the document, diagnostics, wrapping
 * — goes through a dispatch or a compartment rather than a rebuild, because
 * rebuilding drops the undo history, the selection and the scroll position.
 */
export function useCodeMirror(options: Options) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainer(node);
  }, []);

  // Callbacks and one-shot values read through refs so that a new inline
  // function on every render does not tear the editor down and rebuild it.
  const latest = useRef(options);
  latest.current = options;

  const wrapping = useRef(new Compartment()).current;
  // Everything the user's language changes. One compartment, because they are
  // always reconfigured together and two would only be two chances to forget.
  const localised = useRef(new Compartment()).current;

  useEffect(() => {
    if (!container) return;

    const extensions: Extension[] = [
      history(),
      drawSelection(),
      highlightActiveLine(),
      indentOnInput(),
      bracketMatching(),
      // Tab is deliberately left alone: `indentWithTab` would trap keyboard
      // users inside the editor, and the a11y contract requires every region be
      // escapable by keyboard.
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown(),
      // CodeMirror's content is `contenteditable`, which Chrome reports with an
      // IDL `tabIndex` of -1 and leaves out of the tab order: without this the
      // editor cannot be reached by keyboard at all. Verified by tabbing from
      // the toolbar and never arriving.
      EditorView.contentAttributes.of({ tabindex: "0" }),
      vellumSyntaxHighlighting,
      vellumEditorTheme,
      diagnosticGutter({
        badgeLabel: (severity, line) => latest.current.badgeLabel(severity, line),
      }),
      wrapping.of(latest.current.wrap ? EditorView.lineWrapping : []),
      localised.of(localisedExtensions(latest.current.ariaLabel, latest.current.placeholder)),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) latest.current.onChange(update.state.doc.toString());
        if (update.docChanged || update.selectionSet) {
          const head = update.state.selection.main.head;
          const line = update.state.doc.lineAt(head);
          latest.current.onCursorChange({
            line: line.number,
            column: head - line.from + 1,
          });
        }
      }),
    ];

    const state = EditorState.create({ doc: latest.current.value, extensions });
    const view = new EditorView({
      state: state.update({ selection: { anchor: offsetOf(state, latest.current.initialCursor) } })
        .state,
      parent: container,
    });
    viewRef.current = view;

    return () => {
      viewRef.current = null;
      view.destroy();
    };
  }, [container, wrapping, localised]);

  // These four effects all depend on `container` even though they never read
  // it. It is when the view exists: the container arrives on the second render,
  // so an effect that keys only on its own value runs once against a null view
  // and then never again — which is how the first document's diagnostics ended
  // up never reaching the gutter.
  //
  // A new document, pushed in as an edit rather than a rebuild so the view,
  // its extensions and its focus survive. Deliberately not keyed on `value`:
  // see `syncKey`.
  const valueRef = useRef(options.value);
  valueRef.current = options.value;
  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === valueRef.current) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: valueRef.current },
      selection: { anchor: 0 },
    });
  }, [container, options.syncKey]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const severities: Map<number, Diagnostic["severity"]> = new Map();
    for (const diagnostic of options.diagnostics) {
      severities.set(diagnostic.line, diagnostic.severity);
    }
    view.dispatch(
      setDiagnostics(
        view.state,
        options.diagnostics.map((diagnostic) => ({
          ...rangeOf(view.state, diagnostic.line),
          severity: diagnostic.severity,
          message: diagnostic.message,
        })),
      ),
      { effects: setGutterDiagnostics.of(severities) },
    );
  }, [container, options.diagnostics]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: wrapping.reconfigure(options.wrap ? EditorView.lineWrapping : []),
    });
  }, [container, options.wrap, wrapping]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: localised.reconfigure(localisedExtensions(options.ariaLabel, options.placeholder)),
    });
  }, [container, options.ariaLabel, options.placeholder, localised]);

  return { containerRef, view: viewRef };
}

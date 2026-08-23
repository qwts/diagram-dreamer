import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Type, WrapText } from "lucide-react";
import { Toolbar } from "@/components/common/Toolbar";
import { VellumButton } from "@/components/common/VellumButton";
import { testIds } from "@/testids";
import type { DocumentModel } from "@/types/shell";
import { useCodeMirror, type Cursor, type EditorDiagnostic } from "./useCodeMirror";

interface EditorHostProps {
  document: DocumentModel;
  onChange?: ((value: string) => void) | undefined;
  onCursorChange?: ((cursor: Cursor) => void) | undefined;
  onFormat?: (() => void) | undefined;
  onToggleWrap?: ((wrap: boolean) => void) | undefined;
}

/**
 * The editor region: toolbar and chrome around a CodeMirror 6 instance.
 *
 * Text goes in as a prop and comes out through `onChange` — no document state
 * lives here, and nothing is written anywhere. The shell stays a view over a
 * document the host owns (invariant 1).
 */
export function EditorHost({
  document,
  onChange,
  onCursorChange,
  onFormat,
  onToggleWrap,
}: EditorHostProps) {
  const { t } = useTranslation();
  const [wrap, setWrap] = useState(true);

  const value = document.sourcePreview.join("\n");

  // Translated here rather than inside CodeMirror: the editor renders into DOM
  // React does not own, so anything it displays has to arrive already in the
  // user's language (invariant 4).
  const badgeLabel = (severity: EditorDiagnostic["severity"], line: number) =>
    t(severity === "error" ? "editor.gutter.errorBadge" : "editor.gutter.warningBadge", { line });

  const diagnostics = useMemo<EditorDiagnostic[]>(
    () =>
      document.diagnostics.map((diagnostic) => ({
        line: diagnostic.line,
        severity: diagnostic.severity,
        message: t(diagnostic.messageKey, { ...diagnostic.messageValues }),
      })),
    [document.diagnostics, t],
  );

  const { containerRef } = useCodeMirror({
    value,
    syncKey: document.id,
    diagnostics,
    wrap,
    initialCursor: document.cursor,
    ariaLabel: t("editor.content.label", { fileName: document.fileName }),
    placeholder: t("editor.placeholder"),
    badgeLabel,
    onChange: (next) => onChange?.(next),
    onCursorChange: (cursor) => onCursorChange?.(cursor),
  });

  return (
    <section
      aria-label={t("workspace.region.editor")}
      data-testid={testIds.editor.host}
      className="flex h-full min-h-0 flex-col bg-paper"
    >
      <div className="flex items-center justify-between gap-sm border-b border-border bg-surface-raised px-md py-sm">
        <span className="text-label-caps text-slate">{t("editor.title")}</span>
        <Toolbar label={t("editor.toolbar.label")} data-testid={testIds.editor.toolbar}>
          <VellumButton
            variant="ghost"
            size="icon"
            aria-label={t("editor.toolbar.wrap")}
            aria-pressed={wrap}
            data-testid={testIds.editor.wrapToggle}
            onClick={() => {
              setWrap((current) => !current);
              onToggleWrap?.(!wrap);
            }}
          >
            <WrapText className="size-4" aria-hidden="true" />
          </VellumButton>
          <VellumButton
            variant="ghost"
            size="icon"
            aria-label={t("editor.toolbar.format")}
            data-testid={testIds.editor.formatAction}
            // Nothing formats documents yet. An enabled control that silently
            // does nothing is worse than a disabled one — it tells the user the
            // feature exists and that they pressed it wrong.
            disabled={!onFormat}
            onClick={onFormat}
          >
            <Type className="size-4" aria-hidden="true" />
          </VellumButton>
        </Toolbar>
      </div>

      {/*
       * The gutter badges are decoration as far as assistive technology is
       * concerned: CodeMirror renders them inside `.cm-gutters`, which carries
       * `aria-hidden`, and a role or label on a descendant cannot undo a hidden
       * ancestor. This is where the same findings are actually announced —
       * politely, as the a11y contract requires for diagnostics.
       */}
      <div
        data-testid={testIds.editor.announcer}
        // `log`, not `status`: the status bar is already the page's one
        // status landmark, and a second would have the workspace announcing
        // itself from two places. A log is the closer fit anyway — findings
        // accumulate and clear rather than replacing a single value.
        role="log"
        aria-live="polite"
        aria-label={t("editor.diagnostics.label")}
        className="sr-only"
      >
        {diagnostics.length === 0 ? (
          t("editor.diagnostics.none")
        ) : (
          <ul>
            {diagnostics.map((diagnostic) => (
              <li key={`${diagnostic.line}-${diagnostic.message}`}>
                {t("editor.diagnostics.entry", {
                  label: badgeLabel(diagnostic.severity, diagnostic.line),
                  message: diagnostic.message,
                })}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        data-testid={testIds.editor.scrollContainer}
        className="flex min-h-0 flex-1 overflow-hidden font-mono text-code"
        // -1, not 0: this is the F6 region target, and CodeMirror's content is
        // the tab stop. Two stops for one region would mean tabbing past an
        // element that does nothing on the way into the editor.
        tabIndex={-1}
      >
        <div data-testid={testIds.editor.mountSlot} ref={containerRef} className="min-h-0 flex-1" />
      </div>
    </section>
  );
}

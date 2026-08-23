import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { isRtlLanguage } from "@/i18n";

/**
 * Keeps <html lang> and <html dir> in step with the resolved i18n language.
 *
 * The shell does not own locale policy — the host decides which language is
 * active and persists it. This is the one place that reflects that decision
 * into the document, because in Electron the renderer is the only thing that
 * can. Pure effect, no state of its own.
 */
export function DocumentLanguage() {
  const { i18n } = useTranslation();
  // The requested language, not the resolved one. With only `en` bundled,
  // resolvedLanguage falls back to "en" for every locale — but asking for
  // Arabic should still mirror the layout even while the strings stay English.
  // That is exactly the case the RTL smoke gate exercises.
  const language = i18n.language;

  useEffect(() => {
    const root = window.document.documentElement;
    root.lang = language;
    root.dir = isRtlLanguage(language) ? "rtl" : "ltr";
  }, [language]);

  return null;
}

import i18n from "i18next";
import ICU from "i18next-icu";
import { initReactI18next } from "react-i18next";
import en from "./en.json";

export const RTL_LANGUAGES = ["ar", "he", "fa", "ur"];

/**
 * Accepts any BCP-47 shape the host might hand us — "ar", "AR-EG", "ar_EG" —
 * since the tag is not guaranteed to arrive normalised.
 */
export const isRtlLanguage = (language: string): boolean => {
  const primary = language.toLowerCase().split(/[-_]/)[0];
  return primary !== undefined && RTL_LANGUAGES.includes(primary);
};

if (!i18n.isInitialized) {
  void i18n
    .use(ICU)
    .use(initReactI18next)
    .init({
      resources: { en: { translation: en } },
      lng: "en",
      fallbackLng: "en",
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
      // Belt and braces: i18next already loads synchronously when `resources`
      // is supplied inline, but state it so a future change to resource loading
      // cannot silently reintroduce a first render that emits raw keys.
      // (v26 renamed the old `initImmediate` to `initAsync`, inverting it.)
      initAsync: false,
    });
}

export default i18n;

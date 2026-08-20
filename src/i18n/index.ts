import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";

export const RTL_LANGUAGES = ["ar", "he", "fa", "ur"];

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { en: { translation: en } },
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;

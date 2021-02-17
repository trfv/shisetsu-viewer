import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import translation from "../locales/ja/translation.json";

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      ja: {
        translation,
      },
    },
    lng: "ja",
    keySeparator: false, // we do not use keys in form messages.welcome
    nsSeparator: false,
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    fallbackLng: false,
    returnEmptyString: false,
  });

export default i18n;

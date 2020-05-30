import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import common from "../locales/ja/common.json";
import institution from "../locales/ja/institution.json";
import reservation from "../locales/ja/reservation.json";

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      ja: {
        common,
        institution: {
          ...common,
          ...institution,
        },
        reservation: {
          ...common,
          ...reservation,
        },
      },
    },
    lng: "ja",
    keySeparator: false, // we do not use keys in form messages.welcome
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    fallbackLng: false,
    returnEmptyString: false,
  });

export default i18n;

import { format } from "date-fns";

import { fetchHolidays } from "../api/endpoints";
import { useCachedPromise } from "./useCachedPromise";

export const useHolidays = (from: Date, to: Date) => {
  const startDate = format(from, "yyyy-MM-dd");
  const endDate = format(to, "yyyy-MM-dd");
  // 祝日が引けなくても土日の色分けだけで選べるので、日付の選択は止めない。
  return useCachedPromise(`holidays:${startDate}:${endDate}`, () =>
    fetchHolidays({ startDate, endDate }).catch(() => ({ items: [] }))
  );
};

import { fetchScrapeRuns } from "../api/endpoints";
import { useCachedPromise } from "./useCachedPromise";

export const useScrapeRuns = () =>
  // 取得日時は補助情報なので、失敗しても予約の表示は止めない。
  useCachedPromise("scrape-runs", () => fetchScrapeRuns().catch(() => ({ items: [] })));

import {
  addDays,
  addMonths,
  differenceInCalendarWeeks,
  differenceInDays,
  differenceInWeeks,
  endOfMonth,
} from "date-fns";

/**
 * 1回のページ送りがカバーする期間の単位。
 * - "day": 1ページ = 1日（翌日リンクで送るサイト）
 * - "week": 1ページ = 1週間
 * - "twoWeeks": 1ページ = 2週間（WebR Grand 系のカレンダー表示）
 * - "calendarWeek": 1ページ = 暦週（日曜起点。週の途中開始でも1ページと数える）
 */
export type HorizonUnit = "day" | "week" | "twoWeeks" | "calendarWeek";

/**
 * スクレイプ対象期間の宣言的な指定。
 * 開始日 = 今日 + startOffsetDays、終了日 = endOfMonth(開始日) + monthsAhead ヶ月。
 * サイトの予約公開期間に合わせて自治体ごとに設定する。
 */
export interface HorizonSpec {
  /** 何日後から取得を開始するか（0 = 今日、1 = 明日） */
  readonly startOffsetDays: number;
  /** 開始日の月末からさらに何ヶ月先まで取得するか */
  readonly monthsAhead: number;
  readonly unit: HorizonUnit;
}

/**
 * HorizonSpec からページ送り回数の上限を計算する。
 */
export function pagesForHorizon(spec: HorizonSpec, now: Date = new Date()): number {
  const start = addDays(now, spec.startOffsetDays);
  const end = addMonths(endOfMonth(start), spec.monthsAhead);
  switch (spec.unit) {
    case "day":
      return differenceInDays(end, start) + 1;
    case "week":
      return differenceInWeeks(end, start) + 1;
    case "twoWeeks":
      return Math.ceil(differenceInWeeks(end, start) / 2) + 1;
    case "calendarWeek":
      return differenceInCalendarWeeks(end, start) + 1;
  }
}

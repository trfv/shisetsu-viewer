import type { Page } from "@playwright/test";
import type { DiscoveredTarget } from "./discover.ts";
import type { HorizonSpec } from "./horizon.ts";
import type { TransformOutput } from "./types.ts";

/** persist ステップで書き出す 1 ファイル分の内容 */
interface OutputFile {
  /** test-results/<municipality>/<fileName>.json */
  fileName: string;
  /** JSON の facility_name（updateReservations が institution 解決に使う） */
  facilityName: string;
  data: TransformOutput;
}

/**
 * 自治体スクレイパーの宣言的定義。1 target = 1 Playwright テスト。
 *
 * T: スクレイプ対象 1 件分のパラメータ（施設名・リンクチェーン等、自治体ごとに自由）
 * E: extract の中間出力
 *
 * prepare / extract / transform は自作するか、同一予約システムの自治体が既に
 * ある場合は engines/ の hooks（例: openreafHooks）をスプレッドして使う。
 */
export interface ScraperDefinition<T, E> {
  /** 自治体スラッグ（例 "tokyo-kita"）。ディレクトリ名と一致させる */
  municipality: string;
  /** スクレイプ対象の一覧 */
  targets: readonly T[];
  /**
   * 取得ページ数。HorizonSpec なら共通計算（common/horizon.ts）、
   * 対象ごとに変える場合は関数で指定する。
   */
  horizon: HorizonSpec | ((target: T) => number);
  /** 失敗レコードとファイル名に使う施設名 */
  facility: (target: T) => string;
  /** テストタイトル（省略時は facility） */
  title?: (target: T) => string;
  /** 失敗時に修復エージェントが読むコンテキスト（roomName キーは slug 生成に使われる） */
  context?: (target: T) => Record<string, unknown>;
  /** 施設の空き状況テーブルまでページ遷移する */
  prepare: (page: Page, target: T) => Promise<Page>;
  /** ページ送りしながら生データを抽出する（common/paginate.ts の collectPaginated を使う） */
  extract: (page: Page, target: T, pageCount: number) => Promise<E>;
  /** 生データを TransformOutput へ変換する（common/reservation.ts の rawSlotsToOutput を使う） */
  transform: (extracted: E, target: T) => TransformOutput | Promise<TransformOutput>;
  /**
   * 出力ファイルの分割・命名。省略時は facility 名で 1 ファイル。
   * 1 テストで複数部屋を取る自治体は部屋ごとに分割する等に使う。
   */
  outputs?: (data: TransformOutput, target: T) => OutputFile[];
  /**
   * partial extraction 検出用の期待 distinct date 数。
   * 指定すると runScrapeTest がしきい値未満の欠落を structural として扱う。
   */
  expectedDateCount?: (target: T, pageCount: number) => number;
  /**
   * サイトの施設階層をクロールして targets の候補を列挙する
   * （scripts/discover.ts から実行。エンジン使用時は hooks が提供する）。
   */
  discover?: (page: Page) => Promise<DiscoveredTarget[]>;
}

/** 型推論のためのヘルパー。定義オブジェクトをそのまま返す */
export function defineScraper<T, E>(definition: ScraperDefinition<T, E>): ScraperDefinition<T, E> {
  return definition;
}

/**
 * スクレイパー固有の型付きエラー。
 * classifyFailure は正規表現より先に instanceof でこれらを判定するため、
 * エラーメッセージの文言が変わっても分類が安定する。
 */

/** サイトのメンテナンス窓に当たった（一過性。retry レーンで救済）。 */
export class MaintenanceWindowError extends Error {
  override readonly name = "MaintenanceWindowError";
}

/** 対象の施設・部屋が見つからない（構造変化の疑い）。 */
export class TargetNotFoundError extends Error {
  override readonly name = "TargetNotFoundError";
}

/** 抽出できた日数が期待を大きく下回る（構造変化の疑い）。 */
export class PartialExtractionError extends Error {
  override readonly name = "PartialExtractionError";
}

/** テーブル・セレクタなどページ構造の変化を明示的に検知した（構造変化）。 */
export class ScrapeStructureError extends Error {
  override readonly name = "ScrapeStructureError";
}

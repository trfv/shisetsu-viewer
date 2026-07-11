import {
  MaintenanceWindowError,
  PartialExtractionError,
  ScrapeStructureError,
  TargetNotFoundError,
} from "./errors.ts";
import type { FailedStep, FailureClassification } from "./failureTypes.ts";

// 一過性失敗のシグネチャ。これらは retry_scrape で救済されるため修復対象外。
const TRANSIENT_PATTERNS: RegExp[] = [
  /Turnstile/i,
  /net::ERR_/i,
  /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN/i,
  /socket hang up/i,
  /page\.goto.*Timeout/i, // ナビゲーションのタイムアウト（通常はネットワーク起因）
  /システム休止|受付時間外|システムメンテナンス/, // 自治体サイトの定期メンテナンス窓
];

// 構造変化のシグネチャ。要素が消えた／移動した時の典型的なメッセージ。
const STRUCTURAL_PATTERNS: RegExp[] = [
  /locator\.\w+:/i, // 例: "locator.click: Timeout ..."（要素操作の失敗）
  /getByRole|getByText|getByLabel/i,
  /resolved to 0 element/i,
  /strict mode violation/i, // セレクタが複数要素にヒット
  /partial extraction/i, // runScrapeTest の期待日数比チェックで欠落検出
];

// 一過性の Node システムエラーコード（ネットワーク・ソケット起因）。
const TRANSIENT_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "EPIPE",
  "ENOTFOUND",
]);

/** error.cause を辿って最初に見つかった `code` プロパティを返す。 */
function findErrorCode(error: unknown, depth = 0): string | undefined {
  if (depth > 5 || error === null || typeof error !== "object") return undefined;
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string") return code;
  return findErrorCode((error as { cause?: unknown }).cause, depth + 1);
}

/**
 * 失敗を transient / structural / unknown に分類する。
 * 判定順: (1) validate/transform や validationErrors は常に structural →
 * (2) 型付きエラーの instanceof → (3) Node システムエラーコード →
 * (4) Playwright の TimeoutError（name ベース。navigation は transient、要素待ちは structural）→
 * (5) 既存の正規表現 → (6) unknown。
 * 正規表現を最後段に置くことで、エラー文言の変化で unknown に落ちる率を下げる。
 */
export function classifyFailure(
  failedStep: FailedStep,
  error: unknown,
  validationErrors: string[] = []
): FailureClassification {
  // データ品質・パース失敗は常に構造系。
  if (failedStep === "validate" || failedStep === "transform") {
    return "structural";
  }
  if (validationErrors.length > 0) {
    return "structural";
  }

  // (2) 型付きエラー: 文言に依存せず分類が安定する。
  if (error instanceof MaintenanceWindowError) {
    return "transient";
  }
  if (
    error instanceof PartialExtractionError ||
    error instanceof ScrapeStructureError ||
    error instanceof TargetNotFoundError
  ) {
    return "structural";
  }

  // (3) Node システムエラーコード（cause 連鎖を走査）。
  const code = findErrorCode(error);
  if (code !== undefined && TRANSIENT_ERROR_CODES.has(code)) {
    return "transient";
  }

  const message = error instanceof Error ? error.message : String(error);

  // (4) Playwright TimeoutError: メッセージ文言が変わっても name は安定。
  //     ナビゲーション中のタイムアウトは transient、要素待ちのタイムアウトは structural。
  if (error instanceof Error && error.name === "TimeoutError") {
    if (failedStep === "prepare" && /goto|networkidle|navigation/i.test(message)) {
      return "transient";
    }
    return "structural";
  }

  // (5) 既存の正規表現フォールバック。
  if (TRANSIENT_PATTERNS.some((re) => re.test(message))) {
    return "transient";
  }
  if (STRUCTURAL_PATTERNS.some((re) => re.test(message))) {
    return "structural";
  }
  return "unknown";
}

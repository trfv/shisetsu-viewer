import type { FailedStep, FailureClassification } from "./failureTypes.ts";

// 一過性失敗のシグネチャ。これらは retry_scrape で救済されるため修復対象外。
const TRANSIENT_PATTERNS: RegExp[] = [
  /Turnstile/i,
  /net::ERR_/i,
  /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN/i,
  /socket hang up/i,
  /page\.goto.*Timeout/i, // ナビゲーションのタイムアウト（通常はネットワーク起因）
];

// 構造変化のシグネチャ。要素が消えた／移動した時の典型的なメッセージ。
const STRUCTURAL_PATTERNS: RegExp[] = [
  /locator\.\w+:/i, // 例: "locator.click: Timeout ..."（要素操作の失敗）
  /getByRole|getByText|getByLabel/i,
  /resolved to 0 element/i,
  /strict mode violation/i, // セレクタが複数要素にヒット
];

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
  const message = error instanceof Error ? error.message : String(error);
  if (TRANSIENT_PATTERNS.some((re) => re.test(message))) {
    return "transient";
  }
  if (STRUCTURAL_PATTERNS.some((re) => re.test(message))) {
    return "structural";
  }
  return "unknown";
}

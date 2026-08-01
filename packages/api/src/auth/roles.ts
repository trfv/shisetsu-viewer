/** users.role に保存される値。認可に使う実効ロールとは別物である。 */
export type StoredRole = "anonymous" | "trial" | "user";

/** 認可に使う実効ロール。api の契約はこの 2 値である。 */
export type Role = "anonymous" | "user";

export const TRIAL_DURATION_DAYS = 7;

/**
 * 保存ロールとトライアル期限から実効ロールを決める。
 * 期限は ISO8601 の文字列比較で判定する（両方 UTC の Z 表記であることが前提）。
 *
 * サブプロジェクト 3 で mcp-server を自前化するときも、この関数を通す。
 * 通し忘れると期限切れのトライアルユーザーが MCP から予約データを読めてしまう。
 */
export function effectiveRole(
  stored: StoredRole,
  trialExpiresAt: string | null,
  now: string
): Role {
  if (stored === "user") return "user";
  if (stored === "trial" && trialExpiresAt && now < trialExpiresAt) return "user";
  return "anonymous";
}

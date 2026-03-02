/**
 * 許可リストと選択フィールドからGraphQLフィールド選択文字列を構築する。
 *
 * - selected 未指定/空配列 → 全フィールド返却（デフォルト動作）
 * - selected 指定 → 許可リストに含まれるフィールドのみで構築
 * - 不正フィールドは Error をスロー（Zodで事前バリデーション済みだが defense-in-depth）
 */
export function buildFieldSelection(
  allowlist: readonly string[],
  selected?: readonly string[]
): string {
  const fields = selected && selected.length > 0 ? selected : allowlist;

  const allowSet = new Set(allowlist);
  for (const f of fields) {
    if (!allowSet.has(f)) {
      throw new Error(`Invalid field: ${f}`);
    }
  }

  return fields.join("\n        ");
}

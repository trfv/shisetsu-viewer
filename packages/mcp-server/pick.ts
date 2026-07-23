/**
 * `fields` 指定を結果オブジェクトの pick に置換する util（buildFieldSelection の後継）。
 * - allowlist 外のフィールドが渡されたら throw する（旧 buildFieldSelection と同じ契約）。
 * - allowlist 内でも結果オブジェクトに存在しないキーは黙って落とす（DTO に無い旧 GraphQL
 *   フィールド名を弾かないため）。
 */
export function pick<T extends object>(
  obj: T,
  allowed: readonly string[],
  selected: readonly string[] | undefined
): Record<string, unknown> {
  const fields = selected ?? allowed;
  for (const f of fields) {
    if (!allowed.includes(f)) throw new Error(`Invalid field: ${f}`);
  }
  const rec = obj as Record<string, unknown>;
  return Object.fromEntries(fields.filter((f) => f in rec).map((f) => [f, rec[f]]));
}

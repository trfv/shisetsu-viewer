// allowlist 内でも結果に無いキーは throw せず落とす。DTO に無い旧 GraphQL のフィールド名を弾かないため。
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

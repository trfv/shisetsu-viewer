/** 読み取り系ツール共通の annotations */
export const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

/**
 * outputSchema を持つツールの結果。structuredContent が本体で、content のテキスト JSON は
 * structuredContent を読まないクライアントのために同じものを載せる。
 */
export function structuredResult<T extends Record<string, unknown>>(value: T) {
  return { ...jsonResult(value), structuredContent: value };
}

/** ツールの結果を整形済み JSON のテキストで返す */
export function jsonResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

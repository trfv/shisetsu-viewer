export const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

// content にも同じ JSON を載せる。structuredContent を読まないクライアントがある。
export function structuredResult<T extends Record<string, unknown>>(value: T) {
  return { ...jsonResult(value), structuredContent: value };
}

export function jsonResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

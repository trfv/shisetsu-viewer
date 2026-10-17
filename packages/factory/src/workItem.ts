import type { ItemState } from "./types.ts";

// key は重複排除に使うので、state とは別のマーカーに置く（state が壊れても key は読める）。
const KEY_RE = /<!-- factory:key (\S+) -->/;
const STATE_RE = /<!-- factory:state (\{.*?\}) -->/;

export function parseKey(body: string): string | null {
  return KEY_RE.exec(body)?.[1] ?? null;
}

export function parseState(body: string): ItemState | null {
  const raw = STATE_RE.exec(body)?.[1];
  if (raw === undefined) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { consecutive, lastRunId } = value as Record<string, unknown>;
    if (typeof consecutive !== "number") return null;
    if (typeof lastRunId !== "number" && lastRunId !== null) return null;
    return { consecutive, lastRunId };
  } catch {
    return null;
  }
}

export function renderBody(key: string, state: ItemState, text: string): string {
  return `${text}\n\n<!-- factory:key ${key} -->\n<!-- factory:state ${JSON.stringify(state)} -->\n`;
}

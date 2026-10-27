const TTL_MS = 60_000;

type Entry = { promise: Promise<unknown>; expiresAt: number };

const entries = new Map<string, Entry>();

export function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = entries.get(key);
  if (hit && hit.expiresAt > now) return hit.promise as Promise<T>;

  for (const [k, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(k);
  }

  const promise = fetcher();
  // catch を付けておかないと、use() されないまま reject されたときに unhandledrejection になり、
  // ルートの ErrorBoundary が全画面エラーに切り替わる。
  promise.catch(() => {
    if (entries.get(key)?.promise === promise) entries.delete(key);
  });
  entries.set(key, { promise, expiresAt: now + TTL_MS });
  return promise;
}

export function resetCache(): void {
  entries.clear();
}

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
  // reject されても TTL までは捨てない。捨てると、マウント前にサスペンドしたコンポーネントは
  // 再試行のたびに取り直し、失敗し続ける取得が止まらない。
  // catch は unhandledrejection を出さないためだけに付ける。
  promise.catch(() => {});
  entries.set(key, { promise, expiresAt: now + TTL_MS });
  return promise;
}

export function resetCache(): void {
  entries.clear();
}

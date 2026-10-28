import { useMemo } from "react";

import { cached } from "../api/cache";
import { useAuth } from "../contexts/Auth";

export function useCachedPromise<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  // /auth/me の結果より先に叩くと、未ログイン扱いの応答をキャッシュしてしまう。
  useAuth();
  // 同じ key の再 render で TTL 切れの Promise に差し替えると、再サスペンドしてちらつく。
  // fetcher は呼び出し側がインラインで書くので、依存は key だけにする。
  // oxlint-disable-next-line react/exhaustive-deps
  return useMemo(() => cached(key, fetcher), [key]);
}

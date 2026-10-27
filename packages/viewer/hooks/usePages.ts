import type { Page } from "@shisetsu-viewer/shared";
import { addTransitionType, use, useCallback, useRef, useState, useTransition } from "react";

import { useCachedPromise } from "./useCachedPromise";

export const FETCH_MORE = "fetch-more";

export function usePages<T>(key: string, fetchPage: (cursor: string | null) => Promise<Page<T>>) {
  const first = useCachedPromise(key, () => fetchPage(null));
  const [pages, setPages] = useState(() => [first]);
  const resolved = pages.map((page) => use(page));
  const [fetchingMore, startTransition] = useTransition();
  const requestedRef = useRef<string | null>(null);

  const { pageInfo } = use(pages[pages.length - 1] ?? first);
  const endCursor = pageInfo.hasNextPage ? pageInfo.endCursor : null;

  const fetchMore = useCallback(() => {
    // IntersectionObserver は再描画を待たずに続けて発火するので、isPending では二重取得を防げない。
    if (!endCursor || requestedRef.current === endCursor) return;
    requestedRef.current = endCursor;
    // 更新関数の中で取得すると、React が更新関数を再実行するたびに別の Promise になり、解決しない。
    const next = fetchPage(endCursor);
    // transition の描画より先にアンマウントされると誰も use() せず、reject が unhandledrejection になる。
    next.catch(() => {});
    startTransition(() => {
      addTransitionType(FETCH_MORE);
      setPages((prev) => [...prev, next]);
    });
  }, [endCursor, fetchPage]);

  return {
    items: resolved.flatMap((page) => page.items),
    hasNextPage: endCursor !== null,
    fetchMore,
    fetchingMore,
  };
}

import type { Page } from "@shisetsu-viewer/shared";
/* oxlint-disable react-hooks/exhaustive-deps -- fetchPage は呼び出し側がインライン定義するため
   key (安定した識別子) で内容比較し、実体は fetchPageRef 経由で参照する意図的なイディオム */
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth0 } from "../contexts/Auth0";

type UsePaginatedQueryResult<T> = {
  data: T[] | undefined;
  loading: boolean;
  error: Error | undefined;
  hasNextPage: boolean;
  fetchMore: () => Promise<void>;
  fetchingMore: boolean;
};

export function usePaginatedQuery<TItem>(
  fetchPage: (token: string, cursor: string | null) => Promise<Page<TItem>>,
  key: string
): UsePaginatedQueryResult<TItem> {
  const { token, isLoading: authLoading } = useAuth0();
  const [items, setItems] = useState<TItem[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = useState(false);
  const endCursorRef = useRef<string | null>(null);
  const fetchingMoreRef = useRef(false);
  const fetchPageRef = useRef(fetchPage);

  useEffect(() => {
    fetchPageRef.current = fetchPage;
  }, [key]);

  // Initial fetch (resets on key/token change)
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    const fetchInitial = async () => {
      setLoading(true);
      setError(undefined);
      setItems(undefined);
      endCursorRef.current = null;

      try {
        const page = await fetchPageRef.current(token || "", null);
        if (cancelled) return;
        setItems(page.items);
        setHasNextPage(page.pageInfo.hasNextPage);
        endCursorRef.current = page.pageInfo.endCursor;
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchInitial();
    return () => {
      cancelled = true;
    };
  }, [key, token, authLoading]);

  const fetchMore = useCallback(async () => {
    if (!hasNextPage || !endCursorRef.current || fetchingMoreRef.current) return;

    fetchingMoreRef.current = true;
    setFetchingMore(true);
    try {
      const page = await fetchPageRef.current(token || "", endCursorRef.current);
      setItems((prev) => [...(prev ?? []), ...page.items]);
      setHasNextPage(page.pageInfo.hasNextPage);
      endCursorRef.current = page.pageInfo.endCursor;
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      fetchingMoreRef.current = false;
      setFetchingMore(false);
    }
  }, [hasNextPage, token]);

  return { data: items, loading, error, hasNextPage, fetchMore, fetchingMore };
}

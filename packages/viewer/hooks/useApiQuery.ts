/* oxlint-disable react-hooks/exhaustive-deps -- fetcher は呼び出し側がインライン定義するため
   key (安定した識別子) で内容比較し、実体は fetcherRef 経由で参照する意図的なイディオム */
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth0 } from "../contexts/Auth0";

type UseApiQueryResult<T> = {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
};

export function useApiQuery<T>(
  fetcher: (token: string) => Promise<T>,
  key: string
): UseApiQueryResult<T> {
  const { token, isLoading: authLoading } = useAuth0();
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [refetchCount, setRefetchCount] = useState(0);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [key]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await fetcherRef.current(token || "");
        if (cancelled) return;
        setData(result);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [key, token, authLoading, refetchCount]);

  const refetch = useCallback(() => setRefetchCount((c) => c + 1), []);

  return { data, loading, error, refetch };
}

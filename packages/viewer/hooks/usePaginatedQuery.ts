import { useCallback, useEffect, useRef, useState } from "react";
import { graphqlQuery } from "../api/graphqlClient";
import { useAuth0 } from "../contexts/Auth0";

export type RelayConnection<T> = {
  edges: Array<{ node: T; cursor: string }>;
  pageInfo: { hasNextPage: boolean; endCursor: string };
};

type UsePaginatedQueryResult<T> = {
  data: T[] | undefined;
  loading: boolean;
  error: Error | undefined;
  hasNextPage: boolean;
  fetchMore: () => Promise<void>;
  fetchingMore: boolean;
};

export function usePaginatedQuery<TData, TNode>(
  query: string,
  variables: Record<string, unknown>,
  getConnection: (data: TData) => RelayConnection<TNode>
): UsePaginatedQueryResult<TNode> {
  const { token, isLoading: authLoading } = useAuth0();
  const [nodes, setNodes] = useState<TNode[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = useState(false);
  const endCursorRef = useRef<string | null>(null);
  const fetchingMoreRef = useRef(false);
  const variablesRef = useRef(variables);

  const variablesKey = JSON.stringify(variables);

  useEffect(() => {
    variablesRef.current = variables;
  }, [variablesKey]);

  // Initial fetch (resets on variable change)
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    const fetchInitial = async () => {
      setLoading(true);
      setError(undefined);
      setNodes(undefined);
      endCursorRef.current = null;

      try {
        const result = await graphqlQuery<TData>(query, variablesRef.current, token || undefined);
        if (cancelled) return;
        const connection = getConnection(result);
        setNodes(connection.edges.map((e) => e.node));
        setHasNextPage(connection.pageInfo.hasNextPage);
        endCursorRef.current = connection.pageInfo.endCursor;
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
  }, [query, variablesKey, token, authLoading]);

  const fetchMore = useCallback(async () => {
    if (!hasNextPage || !endCursorRef.current || fetchingMoreRef.current) return;

    fetchingMoreRef.current = true;
    setFetchingMore(true);
    try {
      const result = await graphqlQuery<TData>(
        query,
        { ...variablesRef.current, after: endCursorRef.current },
        token || undefined
      );
      const connection = getConnection(result);
      setNodes((prev) => [...(prev ?? []), ...connection.edges.map((e) => e.node)]);
      setHasNextPage(connection.pageInfo.hasNextPage);
      endCursorRef.current = connection.pageInfo.endCursor;
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      fetchingMoreRef.current = false;
      setFetchingMore(false);
    }
  }, [query, hasNextPage, token]);

  return { data: nodes, loading, error, hasNextPage, fetchMore, fetchingMore };
}

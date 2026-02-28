import { useCallback, useEffect, useRef, useState } from "react";
import { graphqlQuery } from "../api/graphqlClient";
import { useAuth0 } from "../contexts/Auth0";

type UseGraphQLQueryResult<T> = {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
};

export function useGraphQLQuery<T>(
  query: string,
  variables: Record<string, unknown>
): UseGraphQLQueryResult<T> {
  const { token } = useAuth0();
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const variablesRef = useRef(variables);

  // Stable reference comparison for variables
  const variablesKey = JSON.stringify(variables);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await graphqlQuery<T>(query, variablesRef.current, token || undefined);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [query, variablesKey, token]);

  useEffect(() => {
    variablesRef.current = variables;
  }, [variablesKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

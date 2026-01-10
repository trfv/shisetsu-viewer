export function extractNodes<T>(connection: { edges: Array<{ node: T }> } | null | undefined): T[] {
  return connection?.edges?.map((edge) => edge.node) ?? [];
}

export function getEndCursor(
  connection: { pageInfo: { endCursor: string | null } } | null | undefined
): string | null {
  return connection?.pageInfo?.endCursor ?? null;
}

export function hasNextPage(
  connection: { pageInfo: { hasNextPage: boolean } } | null | undefined
): boolean {
  return connection?.pageInfo?.hasNextPage ?? false;
}

export function extractRelayParams<T>(
  connection:
    | { edges: Array<{ node: T }>; pageInfo: { endCursor: string | null; hasNextPage: boolean } }
    | null
    | undefined
): { edges: T[]; endCursor: string | null; hasNextPage: boolean } {
  return {
    edges: extractNodes(connection),
    endCursor: getEndCursor(connection),
    hasNextPage: hasNextPage(connection),
  };
}

export function extractSinglePkFromRelayId(relayId: string): string {
  // https://github.com/hasura/graphql-engine/issues/5036#issuecomment-1037909236
  const parts = JSON.parse(atob(relayId));
  return parts[3];
}

export function extractSinglePkFromRelayId(relayId: string): string {
  // https://github.com/hasura/graphql-engine/issues/5036#issuecomment-1037909236
  const parts = JSON.parse(atob(relayId));
  return parts[3];
}

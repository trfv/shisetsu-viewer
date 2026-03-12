import { removeTokens } from "./tokenStore.ts";

export async function logout(): Promise<void> {
  await removeTokens();
  process.stderr.write("Logged out\n");
}

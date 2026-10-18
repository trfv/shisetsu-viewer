import { toBase64Url } from "./session.ts";

const encode = (value: unknown) => toBase64Url(new TextEncoder().encode(JSON.stringify(value)));

/** 署名部はダミー。BFF は署名を検証しないので、クレームだけ組み立てればよい。 */
export function fakeAccessToken(claims: Record<string, unknown>): string {
  return `${encode({ alg: "RS256" })}.${encode(claims)}.sig`;
}

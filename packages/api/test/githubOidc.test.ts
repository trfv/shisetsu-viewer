import { SignJWT, exportJWK, generateKeyPair, importJWK, type JWTVerifyGetKey } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { verifyGithubOidc } from "../src/auth/githubOidc.ts";

const ENV = {
  GITHUB_REPOSITORY_ID: "260482567",
  OIDC_AUDIENCE: "https://api.shisetsudb.com",
};
const ISSUER = "https://token.actions.githubusercontent.com";

let privateKey: CryptoKey;
let getKey: JWTVerifyGetKey;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  privateKey = pair.privateKey;
  const pubJwk = await exportJWK(pair.publicKey);
  pubJwk.kid = "gh-key";
  const publicKey = await importJWK(pubJwk, "RS256");
  getKey = (() => publicKey) as unknown as JWTVerifyGetKey;
});

async function sign(
  claims: Record<string, unknown>,
  opts?: { iss?: string; aud?: string; expired?: boolean }
) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "gh-key" })
    .setIssuer(opts?.iss ?? ISSUER)
    .setAudience(opts?.aud ?? ENV.OIDC_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(opts?.expired ? now - 60 : now + 300)
    .sign(privateKey);
}

describe("verifyGithubOidc", () => {
  it("正しい repository_id + refs/heads/* → true", async () => {
    const token = await sign({ repository_id: ENV.GITHUB_REPOSITORY_ID, ref: "refs/heads/master" });
    expect(await verifyGithubOidc(token, ENV, getKey)).toBe(true);
  });

  it("repository_id 不一致 → false", async () => {
    const token = await sign({ repository_id: "1", ref: "refs/heads/master" });
    expect(await verifyGithubOidc(token, ENV, getKey)).toBe(false);
  });

  it("移転や改名で repository の名前が変わっても repository_id が一致すれば通る", async () => {
    const token = await sign({
      repository: "shisetsudb/shisetsu-viewer",
      repository_id: ENV.GITHUB_REPOSITORY_ID,
      ref: "refs/heads/master",
    });
    expect(await verifyGithubOidc(token, ENV, getKey)).toBe(true);
  });

  it("repository の名前が一致しても repository_id が無ければ false", async () => {
    const token = await sign({
      repository: "shisetsudb/shisetsu-viewer",
      ref: "refs/heads/master",
    });
    expect(await verifyGithubOidc(token, ENV, getKey)).toBe(false);
  });

  it("ref が refs/heads/ でない（PR merge ref）→ false", async () => {
    const token = await sign({ repository_id: ENV.GITHUB_REPOSITORY_ID, ref: "refs/pull/1/merge" });
    expect(await verifyGithubOidc(token, ENV, getKey)).toBe(false);
  });

  it("issuer 不一致 → false", async () => {
    const token = await sign(
      { repository_id: ENV.GITHUB_REPOSITORY_ID, ref: "refs/heads/master" },
      { iss: "https://evil/" }
    );
    expect(await verifyGithubOidc(token, ENV, getKey)).toBe(false);
  });

  it("audience 不一致 → false", async () => {
    const token = await sign(
      { repository_id: ENV.GITHUB_REPOSITORY_ID, ref: "refs/heads/master" },
      { aud: "https://wrong/" }
    );
    expect(await verifyGithubOidc(token, ENV, getKey)).toBe(false);
  });

  it("期限切れ → false", async () => {
    const token = await sign(
      { repository_id: ENV.GITHUB_REPOSITORY_ID, ref: "refs/heads/master" },
      { expired: true }
    );
    expect(await verifyGithubOidc(token, ENV, getKey)).toBe(false);
  });

  it("workflow_dispatch のブランチ ref も通る", async () => {
    const token = await sign({
      repository_id: ENV.GITHUB_REPOSITORY_ID,
      ref: "refs/heads/feature-x",
    });
    expect(await verifyGithubOidc(token, ENV, getKey)).toBe(true);
  });
});

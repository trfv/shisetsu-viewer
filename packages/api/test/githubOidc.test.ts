import { SignJWT, exportJWK, generateKeyPair, importJWK, type JWTVerifyGetKey } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { verifyGithubOidc } from "../src/auth/githubOidc.ts";

const ENV = {
  GITHUB_REPOSITORY: "trfv/shisetsu-viewer",
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
  it("正しい repository + refs/heads/* → true", async () => {
    const token = await sign({ repository: ENV.GITHUB_REPOSITORY, ref: "refs/heads/master" });
    expect(await verifyGithubOidc(token, ENV, getKey)).toBe(true);
  });

  it("repository 不一致 → false", async () => {
    const token = await sign({ repository: "evil/repo", ref: "refs/heads/master" });
    expect(await verifyGithubOidc(token, ENV, getKey)).toBe(false);
  });

  it("ref が refs/heads/ でない（PR merge ref）→ false", async () => {
    const token = await sign({ repository: ENV.GITHUB_REPOSITORY, ref: "refs/pull/1/merge" });
    expect(await verifyGithubOidc(token, ENV, getKey)).toBe(false);
  });

  it("issuer 不一致 → false", async () => {
    const token = await sign(
      { repository: ENV.GITHUB_REPOSITORY, ref: "refs/heads/master" },
      { iss: "https://evil/" }
    );
    expect(await verifyGithubOidc(token, ENV, getKey)).toBe(false);
  });

  it("audience 不一致 → false", async () => {
    const token = await sign(
      { repository: ENV.GITHUB_REPOSITORY, ref: "refs/heads/master" },
      { aud: "https://wrong/" }
    );
    expect(await verifyGithubOidc(token, ENV, getKey)).toBe(false);
  });

  it("期限切れ → false", async () => {
    const token = await sign(
      { repository: ENV.GITHUB_REPOSITORY, ref: "refs/heads/master" },
      { expired: true }
    );
    expect(await verifyGithubOidc(token, ENV, getKey)).toBe(false);
  });

  it("workflow_dispatch のブランチ ref も通る", async () => {
    const token = await sign({ repository: ENV.GITHUB_REPOSITORY, ref: "refs/heads/feature-x" });
    expect(await verifyGithubOidc(token, ENV, getKey)).toBe(true);
  });
});

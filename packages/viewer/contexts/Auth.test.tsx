import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { worker } from "../test/mocks/browser";
import { loadAuthState } from "./Auth";

describe("loadAuthState", () => {
  it("/auth/me の応答を認証状態にする", async () => {
    worker.use(
      http.get("/auth/me", () =>
        HttpResponse.json({ authenticated: true, anonymous: false, trial: true })
      )
    );

    await expect(loadAuthState()).resolves.toEqual({
      authenticated: true,
      userInfo: { anonymous: false, trial: true },
    });
  });

  it("/auth/me が失敗したら匿名扱いにする", async () => {
    worker.use(http.get("/auth/me", () => HttpResponse.json({}, { status: 500 })));

    await expect(loadAuthState()).resolves.toEqual({
      authenticated: false,
      userInfo: { anonymous: true, trial: false },
    });
  });
});

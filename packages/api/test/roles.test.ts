import { describe, expect, it } from "vitest";

import { effectiveRole, TRIAL_DURATION_DAYS } from "../src/auth/roles.ts";

const NOW = "2026-08-01T00:00:00.000Z";

describe("effectiveRole", () => {
  it("user は期限に関係なく user", () => {
    expect(effectiveRole("user", null, NOW)).toBe("user");
  });

  it("anonymous は期限が残っていても anonymous", () => {
    expect(effectiveRole("anonymous", "2026-09-01T00:00:00.000Z", NOW)).toBe("anonymous");
  });

  it("期限内の trial は user", () => {
    expect(effectiveRole("trial", "2026-08-08T00:00:00.000Z", NOW)).toBe("user");
  });

  it("期限切れの trial は anonymous", () => {
    expect(effectiveRole("trial", "2026-07-25T00:00:00.000Z", NOW)).toBe("anonymous");
  });

  it("期限ちょうどは anonymous（境界は期限切れ側）", () => {
    expect(effectiveRole("trial", NOW, NOW)).toBe("anonymous");
  });

  it("期限が NULL の trial は anonymous", () => {
    expect(effectiveRole("trial", null, NOW)).toBe("anonymous");
  });

  it("トライアル期間は 7 日", () => {
    expect(TRIAL_DURATION_DAYS).toBe(7);
  });
});

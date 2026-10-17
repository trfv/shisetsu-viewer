import assert from "node:assert/strict";
import { test } from "node:test";

import { buildRunSummary, parseFailureRecord } from "./runSummary.ts";
import type { FailureRecordLite, JobInfo } from "./types.ts";

const META = {
  runId: 100,
  runUrl: "https://example.test/runs/100",
  createdAt: "2026-10-03T08:23:00Z",
};

const job = (name: string, conclusion: string | null): JobInfo => ({ name, conclusion });
const rec = (
  municipality: string,
  facility: string,
  classification: FailureRecordLite["classification"]
): FailureRecordLite => ({ municipality, facility, classification });

test("全シャード成功なら ok", () => {
  const s = buildRunSummary(
    META,
    [job("Scrape tokyo-kita (1/2)", "success"), job("Scrape tokyo-kita (2/2)", "success")],
    []
  );
  assert.deepEqual(s.municipalities, [
    { municipality: "tokyo-kita", status: "ok", failedFacilities: [] },
  ]);
});

test("scrape で落ちても retry で成功したシャードは ok", () => {
  const s = buildRunSummary(
    META,
    [job("Scrape tokyo-ota (3/5)", "failure"), job("Retry Scrape tokyo-ota (3/5)", "success")],
    []
  );
  assert.equal(s.municipalities[0]?.status, "ok");
});

test("retry 後も落ちて structural レコードがあれば structural", () => {
  const s = buildRunSummary(
    META,
    [job("Scrape tokyo-kita (3/3)", "failure"), job("Retry Scrape tokyo-kita (3/3)", "failure")],
    [
      rec("tokyo-kita", "つつじホール", "structural"),
      rec("tokyo-kita", "つつじホール", "structural"),
    ]
  );
  assert.deepEqual(s.municipalities[0], {
    municipality: "tokyo-kita",
    status: "structural",
    failedFacilities: ["つつじホール"],
  });
});

test("失敗シャードにレコードが無ければ unknown", () => {
  const s = buildRunSummary(
    META,
    [job("Scrape tokyo-chuo (1/1)", "failure"), job("Retry Scrape tokyo-chuo (1/1)", "failure")],
    []
  );
  assert.equal(s.municipalities[0]?.status, "unknown");
});

test("retry ジョブが無い失敗シャードも失敗として数える", () => {
  const s = buildRunSummary(META, [job("Scrape tokyo-chuo (1/1)", "cancelled")], []);
  assert.equal(s.municipalities[0]?.status, "unknown");
});

test("infra は structural より優先する", () => {
  const s = buildRunSummary(
    META,
    [
      job("Scrape tokyo-sumida (1/1)", "failure"),
      job("Retry Scrape tokyo-sumida (1/1)", "failure"),
    ],
    [rec("tokyo-sumida", "(国内 proxy)", "infra"), rec("tokyo-sumida", "A", "structural")]
  );
  assert.equal(s.municipalities[0]?.status, "infra");
});

test("transient レコードだけなら transient", () => {
  const s = buildRunSummary(
    META,
    [job("Scrape tokyo-ota (1/1)", "failure"), job("Retry Scrape tokyo-ota (1/1)", "failure")],
    [rec("tokyo-ota", "A", "transient")]
  );
  assert.equal(s.municipalities[0]?.status, "transient");
});

test("他自治体のレコードは混ざらない", () => {
  const s = buildRunSummary(
    META,
    [
      job("Scrape tokyo-kita (1/1)", "failure"),
      job("Retry Scrape tokyo-kita (1/1)", "failure"),
      job("Scrape tokyo-ota (1/1)", "success"),
    ],
    [rec("tokyo-kita", "A", "structural"), rec("tokyo-ota", "B", "structural")]
  );
  assert.deepEqual(
    s.municipalities.map((m) => [m.municipality, m.status]),
    [
      ["tokyo-kita", "structural"],
      ["tokyo-ota", "ok"],
    ]
  );
});

test("前方一致する別スクレイパーを混同しない", () => {
  const s = buildRunSummary(
    META,
    [
      job("Scrape tokyo-kita (1/1)", "success"),
      job("Scrape tokyo-kita-cocokita (1/1)", "failure"),
      job("Retry Scrape tokyo-kita-cocokita (1/1)", "failure"),
    ],
    [rec("tokyo-kita-cocokita", "ココキタ", "structural")]
  );
  assert.deepEqual(
    s.municipalities.map((m) => [m.municipality, m.status]),
    [
      ["tokyo-kita", "ok"],
      ["tokyo-kita-cocokita", "structural"],
    ]
  );
});

test("Scrape 以外のジョブ名は無視する", () => {
  const s = buildRunSummary(
    META,
    [job("prepare", "success"), job("Collect structural failures", null)],
    []
  );
  assert.deepEqual(s.municipalities, []);
});

test("parseFailureRecord は必須フィールドを検査する", () => {
  assert.deepEqual(
    parseFailureRecord({
      municipality: "tokyo-kita",
      facility: "A",
      classification: "infra",
      extra: 1,
    }),
    { municipality: "tokyo-kita", facility: "A", classification: "infra" }
  );
  assert.equal(parseFailureRecord({ municipality: "tokyo-kita", facility: "A" }), null);
  assert.equal(
    parseFailureRecord({ municipality: "tokyo-kita", facility: "A", classification: "weird" }),
    null
  );
  assert.equal(parseFailureRecord(null), null);
});

// 以下は 2026-10 の実際の定期実行（ジョブ結果と retry 後の失敗レコード）を写したもの。

test("実例 run 38335269203: kawasaki の 1 シャードだけ retry 後も structural", () => {
  const s = buildRunSummary(
    META,
    [
      job("Scrape kanagawa-kawasaki (3/4)", "success"),
      job("Scrape kanagawa-kawasaki (4/4)", "failure"),
      job("Scrape kanagawa-kawasaki (1/4)", "success"),
      job("Scrape kanagawa-kawasaki (2/4)", "success"),
      job("Scrape tokyo-sumida (1/1)", "success"),
      job("Retry Scrape kanagawa-kawasaki (4/4)", "failure"),
    ],
    [rec("kanagawa-kawasaki", "カルッツかわさき", "structural")]
  );
  assert.deepEqual(s.municipalities, [
    {
      municipality: "kanagawa-kawasaki",
      status: "structural",
      failedFacilities: ["カルッツかわさき"],
    },
    { municipality: "tokyo-sumida", status: "ok", failedFacilities: [] },
  ]);
});

test("実例 run 38821487431: kawasaki の全シャードが落ちても retry で救われた分は数えない", () => {
  const s = buildRunSummary(
    META,
    [
      job("Scrape kanagawa-kawasaki (3/4)", "failure"),
      job("Scrape kanagawa-kawasaki (4/4)", "failure"),
      job("Scrape kanagawa-kawasaki (2/4)", "failure"),
      job("Scrape kanagawa-kawasaki (1/4)", "failure"),
      job("Retry Scrape kanagawa-kawasaki (3/4)", "success"),
      job("Retry Scrape kanagawa-kawasaki (2/4)", "success"),
      job("Retry Scrape kanagawa-kawasaki (1/4)", "success"),
      job("Retry Scrape kanagawa-kawasaki (4/4)", "failure"),
    ],
    [rec("kanagawa-kawasaki", "カルッツかわさき", "structural")]
  );
  assert.deepEqual(s.municipalities[0]?.failedFacilities, ["カルッツかわさき"]);
  assert.equal(s.municipalities[0]?.status, "structural");
});

test("実例 run 37864920682: sumida の preflight HTTP 530", () => {
  const jobs = [
    job("Scrape kanagawa-kawasaki (1/4)", "success"),
    job("Scrape tokyo-sumida (1/1)", "failure"),
    job("Retry Scrape tokyo-sumida (1/1)", "failure"),
  ];
  // infra の記録を入れる前（#1728 以前）は、レコードが無く unknown だった。
  assert.equal(buildRunSummary(META, jobs, []).municipalities[1]?.status, "unknown");
  // 現在は preflight の失敗が infra のレコードとして残る。
  assert.equal(
    buildRunSummary(META, jobs, [rec("tokyo-sumida", "(国内 proxy)", "infra")]).municipalities[1]
      ?.status,
    "infra"
  );
});

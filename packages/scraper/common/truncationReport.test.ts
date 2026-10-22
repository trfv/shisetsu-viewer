import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildTruncationReport,
  type CollectedTruncation,
  parseArtifactName,
} from "./truncationReport.ts";

function collected(
  phase: "scrape" | "retry",
  municipality: string,
  shardIndex: string,
  label: string
): CollectedTruncation {
  return {
    phase,
    municipality,
    shardIndex,
    shardTotal: "3",
    record: {
      municipality,
      facility: label,
      context: {},
      maxPages: 31,
      truncations: [
        { label, page: 12, phase: "goNext", message: "Timeout 15000ms exceeded.\nCall log:" },
      ],
      capturedAt: "2026-10-23T00:00:00.000Z",
    },
  };
}

test("artifact 名からフェーズとシャードを読む", () => {
  assert.deepEqual(parseArtifactName("truncations-retry-tokyo-kita-genkiplaza-2-5"), {
    phase: "retry",
    municipality: "tokyo-kita-genkiplaza",
    shardIndex: "2",
    shardTotal: "5",
  });
  assert.equal(parseArtifactName("failures-retry-tokyo-kita-2-5"), null);
});

test("打ち切りが無ければ null を返す", () => {
  assert.equal(buildTruncationReport([], []), null);
});

test("位置を maxPages 付きで、エラーを 1 行目だけ表に出す", () => {
  const report = buildTruncationReport([collected("scrape", "tokyo-bunkyo", "1", "大原")], []);
  assert.match(
    report ?? "",
    /\| tokyo-bunkyo \| 大原 \|  \| 12 \/ 31 \| goNext \| Timeout 15000ms exceeded\. \|/
  );
  assert.doesNotMatch(report ?? "", /Call log/);
});

test("retry したシャードは scrape フェーズの記録を捨てて retry の記録だけを使う", () => {
  const report = buildTruncationReport(
    [
      collected("scrape", "tokyo-bunkyo", "1", "大原"),
      collected("scrape", "tokyo-bunkyo", "2", "勤労福祉会館"),
      collected("retry", "tokyo-bunkyo", "1", "駒込"),
    ],
    [{ municipality: "tokyo-bunkyo", shardIndex: "1", shardTotal: "3" }]
  );
  assert.doesNotMatch(report ?? "", /大原/);
  assert.match(report ?? "", /勤労福祉会館/);
  assert.match(report ?? "", /駒込/);
});

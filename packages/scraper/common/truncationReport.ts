import type { TruncationRecord } from "./truncationRecord.ts";

export interface ShardRef {
  readonly municipality: string;
  readonly shardIndex: string;
  readonly shardTotal: string;
}

export interface CollectedTruncation extends ShardRef {
  readonly phase: "scrape" | "retry";
  readonly record: TruncationRecord;
}

const ARTIFACT_RE = /^truncations-(scrape|retry)-(.+)-(\d+)-(\d+)$/;

export function parseArtifactName(name: string): (ShardRef & { phase: "scrape" | "retry" }) | null {
  const m = ARTIFACT_RE.exec(name);
  if (!m) return null;
  return {
    phase: m[1] as "scrape" | "retry",
    municipality: m[2] ?? "",
    shardIndex: m[3] ?? "",
    shardTotal: m[4] ?? "",
  };
}

const sameShard = (a: ShardRef, b: ShardRef): boolean =>
  a.municipality === b.municipality &&
  a.shardIndex === b.shardIndex &&
  a.shardTotal === b.shardTotal;

const MAX_ROWS = 200;

const esc = (v: string): string => v.replace(/[\\|]/g, "\\$&").replace(/\s+/g, " ").trim();

export function buildTruncationReport(
  collected: readonly CollectedTruncation[],
  retriedShards: readonly ShardRef[]
): string | null {
  // retry したシャードは全施設を取り直しているので、scrape フェーズの記録は古い
  const current = collected.filter(
    (c) => c.phase === "retry" || !retriedShards.some((r) => sameShard(r, c))
  );
  const rows = current
    .flatMap(({ record }) => {
      const room = typeof record.context["roomName"] === "string" ? record.context["roomName"] : "";
      return record.truncations.map((t) => ({ record, room, t }));
    })
    .sort(
      (a, b) =>
        a.record.municipality.localeCompare(b.record.municipality) ||
        a.t.label.localeCompare(b.t.label)
    );
  if (rows.length === 0) return null;

  const lines = [
    "ページ送りが途中で打ち切られた施設です。テストは成功扱いで、打ち切り前の部分結果だけが保存されています。",
    "",
    "サイトの公開期間の終わりで止まっているだけなら、その scraper の `goNext` / `extractPage` が throw せず `false` / `null` を返すように直してください。",
    "",
    "| 自治体 | 施設 | 部屋 | 位置 | 段階 | エラー |",
    "|---|---|---|---|---|---|",
    ...rows.slice(0, MAX_ROWS).map(({ record, room, t }) => {
      const position = `${t.page} / ${record.maxPages ?? "?"}`;
      const message = esc(t.message.split("\n")[0] ?? "").slice(0, 120);
      return `| ${esc(record.municipality)} | ${esc(t.label)} | ${esc(room)} | ${position} | ${t.phase} | ${message} |`;
    }),
  ];
  if (rows.length > MAX_ROWS) lines.push("", `_他 ${rows.length - MAX_ROWS} 件は省略_`);
  return lines.join("\n");
}

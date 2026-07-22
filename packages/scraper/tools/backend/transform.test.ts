import assert from "node:assert/strict";
import { test } from "node:test";

import { buildReservationRows } from "./transform.ts";
import type { FileData, InstitutionKeyMap } from "./types.ts";

const keyMap: InstitutionKeyMap = {
  "会館A-音楽室": "id-a-music",
  "会館A-ホール": "id-a-hall",
};

test("キーマップに一致する行だけを institution_id 解決して返す", () => {
  const files: FileData[] = [
    {
      facility_name: "会館A",
      data: [
        { room_name: "音楽室", date: "2026-08-01", reservation: { M: "VACANT" } },
        { room_name: "未知の部屋", date: "2026-08-01", reservation: { M: "VACANT" } },
      ],
    },
  ];
  const { rows, unmatchedKeys } = buildReservationRows(files, keyMap);
  assert.deepEqual(rows, [
    { institution_id: "id-a-music", date: "2026-08-01", reservation: { M: "VACANT" } },
  ]);
  assert.deepEqual(unmatchedKeys, ["会館A-未知の部屋"]);
});

test("(institution_id, date) の重複は先勝ちで 1 行にする", () => {
  const files: FileData[] = [
    {
      facility_name: "会館A",
      data: [
        { room_name: "音楽室", date: "2026-08-01", reservation: { M: "FIRST" } },
        { room_name: "音楽室", date: "2026-08-01", reservation: { M: "SECOND" } },
        { room_name: "音楽室", date: "2026-08-02", reservation: { M: "OTHER_DAY" } },
      ],
    },
  ];
  const { rows } = buildReservationRows(files, keyMap);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0]?.reservation, { M: "FIRST" });
});

test("複数ファイルを 1 つの行リストに統合する", () => {
  const files: FileData[] = [
    {
      facility_name: "会館A",
      data: [{ room_name: "音楽室", date: "2026-08-01", reservation: {} }],
    },
    {
      facility_name: "会館A",
      data: [{ room_name: "ホール", date: "2026-08-01", reservation: {} }],
    },
  ];
  const { rows } = buildReservationRows(files, keyMap);
  assert.deepEqual(
    rows.map((r) => r.institution_id),
    ["id-a-music", "id-a-hall"]
  );
});

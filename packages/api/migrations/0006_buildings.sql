-- 0006: 建物のマスタを足し、部屋から building_id で指す。
-- 部屋の建物の欄（building / address など）はまだ読み取りが使うので残し、upsert で buildings から写す。
-- reservation_system は registry の RESERVATION_SYSTEMS のキー。手動登録の建物があるので NULL を許す。
CREATE TABLE buildings (
  id TEXT PRIMARY KEY,
  prefecture TEXT NOT NULL,
  municipality TEXT NOT NULL,
  name TEXT NOT NULL,
  kana TEXT NOT NULL DEFAULT '',
  system_name TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  reservation_system TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_buildings_list ON buildings (municipality, kana, id);
-- 空文字はスクレイプ対象外の手動登録なので除く
CREATE UNIQUE INDEX idx_buildings_system_key
  ON buildings (reservation_system, system_name)
  WHERE system_name <> '';

ALTER TABLE institutions ADD COLUMN building_id TEXT REFERENCES buildings (id);
CREATE INDEX idx_institutions_building ON institutions (building_id, institution_kana, id);

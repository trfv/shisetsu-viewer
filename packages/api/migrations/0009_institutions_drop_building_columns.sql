-- 0009: 部屋の行から建物の欄を落とし、building_id を NOT NULL にする。
-- SQLite は列の NOT NULL 化も CHECK 付き列の DROP COLUMN もできないので作り直す。
-- building_id が NULL の行が残っていれば INSERT が NOT NULL 違反で止まり、マイグレーションごと失敗する。
CREATE TABLE institutions_new (
  id TEXT PRIMARY KEY,   -- 非 RFC UUID を 17 件含むため形式 CHECK は付けない
  building_id TEXT NOT NULL REFERENCES buildings (id),
  institution TEXT NOT NULL DEFAULT '',
  institution_kana TEXT NOT NULL DEFAULT '',
  institution_system_name TEXT NOT NULL DEFAULT '',
  capacity INTEGER,
  area REAL,
  institution_size TEXT NOT NULL DEFAULT 'INSTITUTION_SIZE_UNKNOWN' CHECK (
    institution_size IN (
      'INSTITUTION_SIZE_INVALID', 'INSTITUTION_SIZE_LARGE', 'INSTITUTION_SIZE_MEDIUM',
      'INSTITUTION_SIZE_SMALL', 'INSTITUTION_SIZE_UNKNOWN'
    )
  ),
  fee_divisions TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(fee_divisions)),
  weekday_usage_fee TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(weekday_usage_fee)),
  holiday_usage_fee TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(holiday_usage_fee)),
  is_available_strings TEXT NOT NULL DEFAULT 'AVAILABILITY_DIVISION_UNKNOWN' CHECK (
    is_available_strings IN (
      'AVAILABILITY_DIVISION_INVALID', 'AVAILABILITY_DIVISION_AVAILABLE',
      'AVAILABILITY_DIVISION_UNAVAILABLE', 'AVAILABILITY_DIVISION_UNKNOWN'
    )
  ),
  is_available_woodwind TEXT NOT NULL DEFAULT 'AVAILABILITY_DIVISION_UNKNOWN' CHECK (
    is_available_woodwind IN (
      'AVAILABILITY_DIVISION_INVALID', 'AVAILABILITY_DIVISION_AVAILABLE',
      'AVAILABILITY_DIVISION_UNAVAILABLE', 'AVAILABILITY_DIVISION_UNKNOWN'
    )
  ),
  is_available_brass TEXT NOT NULL DEFAULT 'AVAILABILITY_DIVISION_UNKNOWN' CHECK (
    is_available_brass IN (
      'AVAILABILITY_DIVISION_INVALID', 'AVAILABILITY_DIVISION_AVAILABLE',
      'AVAILABILITY_DIVISION_UNAVAILABLE', 'AVAILABILITY_DIVISION_UNKNOWN'
    )
  ),
  is_available_percussion TEXT NOT NULL DEFAULT 'AVAILABILITY_DIVISION_UNKNOWN' CHECK (
    is_available_percussion IN (
      'AVAILABILITY_DIVISION_INVALID', 'AVAILABILITY_DIVISION_AVAILABLE',
      'AVAILABILITY_DIVISION_UNAVAILABLE', 'AVAILABILITY_DIVISION_UNKNOWN'
    )
  ),
  is_equipped_music_stand TEXT NOT NULL DEFAULT 'EQUIPMENT_DIVISION_UNKNOWN' CHECK (
    is_equipped_music_stand IN (
      'EQUIPMENT_DIVISION_INVALID', 'EQUIPMENT_DIVISION_EQUIPPED',
      'EQUIPMENT_DIVISION_UNEQUIPPED', 'EQUIPMENT_DIVISION_UNKNOWN'
    )
  ),
  is_equipped_piano TEXT NOT NULL DEFAULT 'EQUIPMENT_DIVISION_UNKNOWN' CHECK (
    is_equipped_piano IN (
      'EQUIPMENT_DIVISION_INVALID', 'EQUIPMENT_DIVISION_EQUIPPED',
      'EQUIPMENT_DIVISION_UNEQUIPPED', 'EQUIPMENT_DIVISION_UNKNOWN'
    )
  ),
  website_url TEXT NOT NULL DEFAULT '',
  layout_image_url TEXT NOT NULL DEFAULT '',
  lottery_period TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  division_labels TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(division_labels)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT INTO institutions_new (
  id, building_id, institution, institution_kana, institution_system_name, capacity, area,
  institution_size, fee_divisions, weekday_usage_fee, holiday_usage_fee,
  is_available_strings, is_available_woodwind, is_available_brass, is_available_percussion,
  is_equipped_music_stand, is_equipped_piano, website_url, layout_image_url, lottery_period, note,
  division_labels, created_at, updated_at
)
SELECT
  id, building_id, institution, institution_kana, institution_system_name, capacity, area,
  institution_size, fee_divisions, weekday_usage_fee, holiday_usage_fee,
  is_available_strings, is_available_woodwind, is_available_brass, is_available_percussion,
  is_equipped_music_stand, is_equipped_piano, website_url, layout_image_url, lottery_period, note,
  division_labels, created_at, updated_at
FROM institutions;
DROP TABLE institutions;
ALTER TABLE institutions_new RENAME TO institutions;

CREATE INDEX idx_institutions_building ON institutions (building_id, institution_kana, id);
-- 建物の system_name は予約システム内で一意でない（目黒区の本館と別館）ので、建物は id で区別する
CREATE UNIQUE INDEX idx_institutions_system_key
  ON institutions (building_id, institution_system_name)
  WHERE institution_system_name <> '';

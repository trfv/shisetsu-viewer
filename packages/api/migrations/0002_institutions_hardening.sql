-- 0002: institutions の整合性を schema で強制する + 江戸川区の二重登録を解消する。
-- reservations テーブル本体（DDL）には触れない — 初回充填と Hasura パリティ突合に影響しない。
-- 書き込みコストは institutions 594 行の作り直し（~2.5 千行）で Free 枠に無風。
-- DELETE 対象 3 UUID を含む本内容はユーザー承認済み（2026-07-15）。

-- 1) 江戸川区 小松川区民館の二重登録（同一内容・別 UUID が 3 組）を解消する。
--    Hasura 時代からの持ち越しで、scraper の解決キー `${building_system_name}-${institution_system_name}`
--    が衝突し「後勝ち」が非決定になっていた実バグ。残す id は Hasura の reservations.updated_at で
--    「現在スクレイプ更新が届いている側」を実証して選定（2026-07-15）:
--      ホール         残 40972b5a-d0f1-4e80-94e0-ad45496b5f6b / 除 2e2b30b0-…（2026-03 で更新停止）
--      集会室第１     残 1b01954e-284f-4a48-8af0-1577774c04b0 / 除 70221e53-…（予約データなし）
--      集会室第２・３ 残 4140577f-be98-44a3-901c-725e6094c013 / 除 6e482221-…（予約データなし）
--    負け側の予約行も念のため削除（適用時点で D1 には 0 行のはずだが、keymap の後勝ちが
--    flip していた場合に孤児が残らないように）。
DELETE FROM reservations WHERE institution_id IN (
  '2e2b30b0-b34e-4ff1-a6ef-94a70c504636',
  '70221e53-4359-47cc-9068-9844ade83776',
  '6e482221-b764-483e-9059-00a6247cce6c'
);
DELETE FROM institutions WHERE id IN (
  '2e2b30b0-b34e-4ff1-a6ef-94a70c504636',
  '70221e53-4359-47cc-9068-9844ade83776',
  '6e482221-b764-483e-9059-00a6247cce6c'
);

-- 2) enum 列（institution_size / is_available_* / is_equipped_*）に CHECK を付ける。
--    書き込みは API 経由のみだがランタイム検証が型しかなく、typo った enum 値が黙って入るため。
--    SQLite は ADD CONSTRAINT できないので作り直し（既存 594 行は全行適合を本番で確認済み）。
CREATE TABLE institutions_new (
  id TEXT PRIMARY KEY,   -- 非 RFC UUID を 17 件含むため形式 CHECK は付けない
  prefecture TEXT NOT NULL,
  municipality TEXT NOT NULL,
  building TEXT NOT NULL DEFAULT '',
  institution TEXT NOT NULL DEFAULT '',
  building_kana TEXT NOT NULL DEFAULT '',
  institution_kana TEXT NOT NULL DEFAULT '',
  building_system_name TEXT NOT NULL DEFAULT '',
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
  address TEXT NOT NULL DEFAULT '',
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
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT INTO institutions_new SELECT * FROM institutions;
DROP TABLE institutions;
ALTER TABLE institutions_new RENAME TO institutions;

-- 一覧の ORDER BY と keyset カーソルをこの順序で満たす（0001 と同一）
CREATE INDEX idx_institutions_list
  ON institutions (municipality, building_kana, institution_kana, id);

-- 3) scraper の解決キーの一意性を自治体内で強制する（上の二重登録の再発防止）。
--    空文字はスクレイプ対象外の手動登録施設（北区ココキタ、豊島区 東京藝術劇場など 22 件）
--    なので部分インデックスで除外する。違反時は upsert が throw → API 500 で fail loud。
CREATE UNIQUE INDEX idx_institutions_system_key
  ON institutions (municipality, building_system_name, institution_system_name)
  WHERE building_system_name <> '' AND institution_system_name <> '';

-- institutions: 25 フィールドを 1:1 カラム化（fee 系 3 つのみ JSON TEXT）。
-- 594 行・更新は年数回なので、インデックスの書き込み増幅は無視できる。
CREATE TABLE institutions (
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
  institution_size TEXT NOT NULL DEFAULT 'INSTITUTION_SIZE_UNKNOWN',
  fee_divisions TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(fee_divisions)),
  weekday_usage_fee TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(weekday_usage_fee)),
  holiday_usage_fee TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(holiday_usage_fee)),
  address TEXT NOT NULL DEFAULT '',
  is_available_strings TEXT NOT NULL DEFAULT 'AVAILABILITY_DIVISION_UNKNOWN',
  is_available_woodwind TEXT NOT NULL DEFAULT 'AVAILABILITY_DIVISION_UNKNOWN',
  is_available_brass TEXT NOT NULL DEFAULT 'AVAILABILITY_DIVISION_UNKNOWN',
  is_available_percussion TEXT NOT NULL DEFAULT 'AVAILABILITY_DIVISION_UNKNOWN',
  is_equipped_music_stand TEXT NOT NULL DEFAULT 'EQUIPMENT_DIVISION_UNKNOWN',
  is_equipped_piano TEXT NOT NULL DEFAULT 'EQUIPMENT_DIVISION_UNKNOWN',
  website_url TEXT NOT NULL DEFAULT '',
  layout_image_url TEXT NOT NULL DEFAULT '',
  lottery_period TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
-- 一覧の ORDER BY と keyset カーソルをこの順序で満たす
CREATE INDEX idx_institutions_list
  ON institutions (municipality, building_kana, institution_kana, id);

-- reservations: Free tier 最適化 + セマンティクスの単一化。
--  * PRIMARY KEY (institution_id, date) + WITHOUT ROWID → UNIQUE 用の暗黙インデックスを排除
--  * 二次インデックスは idx(date) 1 本のみ → 新規 INSERT の書き込み増幅は 2 行（本体 + index）
--  * WITHOUT ROWID の二次インデックスは (date, institution_id) 順のキーになるため、
--    ORDER BY date, institution_id がソートなしで返る = keyset カーソルと完全一致する
--  * 空き 3 フラグは STORED 生成列。reservation を書けば自動追随し、差分 WHERE が 1 列で済む
--  * is_holiday 列は持たない（date から決まるためクエリ時に導出。祝日表の更新で行を書き直さない）
CREATE TABLE reservations (
  institution_id TEXT NOT NULL,
  date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  reservation TEXT NOT NULL CHECK (json_valid(reservation)),
  is_morning_vacant INTEGER NOT NULL GENERATED ALWAYS AS (
    CASE
      WHEN json_extract(reservation, '$.RESERVATION_DIVISION_MORNING') IS NOT NULL
        THEN json_extract(reservation, '$.RESERVATION_DIVISION_MORNING') = 'RESERVATION_STATUS_VACANT'
      ELSE COALESCE(
        json_extract(reservation, '$.RESERVATION_DIVISION_MORNING_ONE') = 'RESERVATION_STATUS_VACANT'
        AND json_extract(reservation, '$.RESERVATION_DIVISION_MORNING_TWO') = 'RESERVATION_STATUS_VACANT',
        0)
    END
  ) STORED,
  is_afternoon_vacant INTEGER NOT NULL GENERATED ALWAYS AS (
    CASE
      WHEN json_extract(reservation, '$.RESERVATION_DIVISION_AFTERNOON') IS NOT NULL
        THEN json_extract(reservation, '$.RESERVATION_DIVISION_AFTERNOON') = 'RESERVATION_STATUS_VACANT'
      ELSE COALESCE(
        json_extract(reservation, '$.RESERVATION_DIVISION_AFTERNOON_ONE') = 'RESERVATION_STATUS_VACANT'
        AND json_extract(reservation, '$.RESERVATION_DIVISION_AFTERNOON_TWO') = 'RESERVATION_STATUS_VACANT',
        0)
    END
  ) STORED,
  is_evening_vacant INTEGER NOT NULL GENERATED ALWAYS AS (
    CASE
      WHEN json_extract(reservation, '$.RESERVATION_DIVISION_EVENING') IS NOT NULL
        THEN json_extract(reservation, '$.RESERVATION_DIVISION_EVENING') = 'RESERVATION_STATUS_VACANT'
      ELSE COALESCE(
        json_extract(reservation, '$.RESERVATION_DIVISION_EVENING_ONE') = 'RESERVATION_STATUS_VACANT'
        AND json_extract(reservation, '$.RESERVATION_DIVISION_EVENING_TWO') = 'RESERVATION_STATUS_VACANT',
        0)
    END
  ) STORED,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (institution_id, date)
) WITHOUT ROWID;
CREATE INDEX idx_reservations_date ON reservations (date);

-- 祝日（is_holiday のクエリ時導出に使う。Hasura holidays からシード、年次更新）
CREATE TABLE holidays (
  date TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT ''
) WITHOUT ROWID;

-- スクレイプ run の記録: 「最終取得時刻」の表示ソース + 日次書き込み予算の台帳。
-- 1 日 ~24 行しかないためインデックスは張らない（全表スキャンで十分・書き込み増幅を避ける）。
CREATE TABLE scrape_runs (
  municipality TEXT NOT NULL,
  run_id TEXT NOT NULL,
  run_date TEXT NOT NULL,   -- UTC 日付。日次書き込み予算の集計キー（D1 の枠は 00:00 UTC リセット）
  fetched_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  rows_written INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (municipality, run_id)
) WITHOUT ROWID;

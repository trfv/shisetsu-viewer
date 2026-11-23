-- 0008: scrape_runs を予約システム単位にする。
-- 旧行は自治体の主の予約システムへ寄せて残す。消すと当日の書き込み予算（todayRowsWritten）が 0 に戻る。
CREATE TABLE scrape_runs_new (
  reservation_system TEXT NOT NULL,
  run_id TEXT NOT NULL,
  run_date TEXT NOT NULL,   -- UTC 日付。日次書き込み予算の集計キー（D1 の枠は 00:00 UTC リセット）
  fetched_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  rows_written INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (reservation_system, run_id)
) WITHOUT ROWID;

INSERT INTO scrape_runs_new (reservation_system, run_id, run_date, fetched_at, rows_written)
WITH m (municipality, reservation_system) AS (
  VALUES
    ('MUNICIPALITY_KOUTOU', 'tokyo-koutou'),
    ('MUNICIPALITY_BUNKYO', 'tokyo-bunkyo'),
    ('MUNICIPALITY_KITA', 'tokyo-kita'),
    ('MUNICIPALITY_TOSHIMA', 'tokyo-toshima'),
    ('MUNICIPALITY_EDOGAWA', 'tokyo-edogawa'),
    ('MUNICIPALITY_ARAKAWA', 'tokyo-arakawa'),
    ('MUNICIPALITY_SUMIDA', 'tokyo-sumida'),
    ('MUNICIPALITY_OTA', 'tokyo-ota'),
    ('MUNICIPALITY_SUGINAMI', 'tokyo-suginami'),
    ('MUNICIPALITY_CHUO', 'tokyo-chuo'),
    ('MUNICIPALITY_NAKANO', 'tokyo-nakano'),
    ('MUNICIPALITY_KAWASAKI', 'kanagawa-kawasaki'),
    ('MUNICIPALITY_MEGURO', 'tokyo-meguro'),
    ('MUNICIPALITY_SETAGAYA', 'tokyo-setagaya'),
    ('MUNICIPALITY_TAITO', 'tokyo-taito'),
    ('MUNICIPALITY_SHINAGAWA', 'tokyo-shinagawa'),
    ('MUNICIPALITY_SHINJUKU', 'tokyo-shinjuku'),
    ('MUNICIPALITY_MINATO', 'tokyo-minato'),
    ('MUNICIPALITY_ADACHI', 'tokyo-adachi'),
    ('MUNICIPALITY_KATSUSHIKA', 'tokyo-katsushika')
)
SELECT m.reservation_system, s.run_id, s.run_date, s.fetched_at, s.rows_written
FROM scrape_runs s
JOIN m ON m.municipality = s.municipality;

DROP TABLE scrape_runs;
ALTER TABLE scrape_runs_new RENAME TO scrape_runs;

-- 0003: 施設単位の区分ラベル（division_labels）を足す。
-- 区分ラベルは registry の「自治体 × enum 値」で引いていたが、同じ自治体の別予約システムが
-- 同じ enum 値に別の時刻を要求する場合がある（北区ココキタの午前 9:00-11:45 と OpenReaf の
-- 9:00-12:00）。enum 値は is_*_vacant 生成列が名指ししているので変えられず、ラベルを施設に持たせる。
-- 形は {"RESERVATION_DIVISION_MORNING": "9:00-11:45", ...}。キーに無い区分は registry に落ちる。
-- 設計: docs/superpowers/specs/2026-07-29-kita-genkiplaza-scraper-design.md「衝突が起きたときの移行先」
-- ADD COLUMN は既存行を書き換えない（DEFAULT はスキーマに記録されるだけ）ので書き込みコストはほぼ無い。
ALTER TABLE institutions
  ADD COLUMN division_labels TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(division_labels));

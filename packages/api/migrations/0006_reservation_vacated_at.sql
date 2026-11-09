-- 区分ごとの「空きに変わった時刻」。判定は区分ごとに要るが、絞り込みで日付範囲を全走査しないよう、
-- 最新の時刻を vacated_at に重ねて持ち、そこにだけ索引を張る。NULL を外すのは新規 INSERT で索引を書かないため。
ALTER TABLE reservations ADD COLUMN morning_vacated_at TEXT;
ALTER TABLE reservations ADD COLUMN afternoon_vacated_at TEXT;
ALTER TABLE reservations ADD COLUMN evening_vacated_at TEXT;
ALTER TABLE reservations ADD COLUMN vacated_at TEXT;
CREATE INDEX idx_reservations_vacated_at ON reservations (vacated_at) WHERE vacated_at IS NOT NULL;

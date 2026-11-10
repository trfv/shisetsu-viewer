-- 0007: 予約検索を reservation_system で絞るとき、索引が無いとプランナーが日付の索引で予約を全件たどる
CREATE INDEX idx_buildings_reservation_system ON buildings (reservation_system);

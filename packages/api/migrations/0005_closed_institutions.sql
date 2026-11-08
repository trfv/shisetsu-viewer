-- 0005: 閉館した 10 室と重複 2 行を施設マスタから外す。休館中の部屋は再開するので残す。
-- 施設 JSON から消しても Database ワークフローの upsert は行を消さないため、ここで消す。
DELETE FROM reservations WHERE institution_id IN (
  '720beb2e-1319-4b1d-9857-d29748778452',
  '690c5bd2-e4c5-4e3b-bbb3-887f4df4f868',
  'debef11b-87d4-4f53-ae20-ee6f2e3f521b',
  'aceb35b3-825c-457c-810a-6866febbe7f7',
  '698c5bf2-50be-40f0-bde2-b2fd3de7c3de',
  'fc337e43-94dd-4199-89ba-27057f8b97ea',
  'da6bd749-8f57-4c87-8f29-3906dcb0df62',
  '517c6ac9-dc58-446d-9ead-7871f803c8f9',
  '981530a9-0d81-4fed-a779-bec2155339ce',
  'fa9e759d-e326-482c-943e-5aa925de56f1',
  '94701f06-97b8-405f-a5ce-1d1b9b7000fe',
  'd8510c4c-e606-4b0e-b886-71df35554b83'
);
DELETE FROM institutions WHERE id IN (
  '720beb2e-1319-4b1d-9857-d29748778452',
  '690c5bd2-e4c5-4e3b-bbb3-887f4df4f868',
  'debef11b-87d4-4f53-ae20-ee6f2e3f521b',
  'aceb35b3-825c-457c-810a-6866febbe7f7',
  '698c5bf2-50be-40f0-bde2-b2fd3de7c3de',
  'fc337e43-94dd-4199-89ba-27057f8b97ea',
  'da6bd749-8f57-4c87-8f29-3906dcb0df62',
  '517c6ac9-dc58-446d-9ead-7871f803c8f9',
  '981530a9-0d81-4fed-a779-bec2155339ce',
  'fa9e759d-e326-482c-943e-5aa925de56f1',
  '94701f06-97b8-405f-a5ce-1d1b9b7000fe',
  'd8510c4c-e606-4b0e-b886-71df35554b83'
);

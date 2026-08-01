-- 0003: 自前認証のための users と sessions を追加する。
-- google_sub を NULL 許容にしているのは、Auth0 から移行する既存ユーザーを
-- email だけ先に投入し、初回 Google ログイン時に紐づけるためである。
-- trial_expires_at を列に持つのは、トライアル期間の設定を後で変えたときに
-- 既存ユーザーの期限が遡って動かないようにするためである。

CREATE TABLE users (
  id               TEXT PRIMARY KEY,
  google_sub       TEXT UNIQUE,
  email            TEXT NOT NULL UNIQUE,
  role             TEXT NOT NULL DEFAULT 'trial'
                   CHECK (role IN ('anonymous', 'trial', 'user')),
  trial_expires_at TEXT,
  created_at       TEXT NOT NULL,
  last_login_at    TEXT
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_sessions_user ON sessions(user_id);

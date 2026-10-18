# Infra Package

Cloudflare の設定のうち、`wrangler.jsonc` に書けないものを扱う。依存もビルドも無い（Node 24 が TS を直接実行する）。設計は `docs/superpowers/specs/2026-10-19-cloudflare-config-as-code-design.md`。

- `builds.json` — 3 Worker の Workers Builds のトリガーの宣言。トリガー名で特定する（UUID は書かない）。ビルド変数は値ごと書く（秘密の値は無い）。
- `builds.ts` — 宣言と本番を比べて差分を出す。書き込みはしない。pull request（`.github/workflows/cloudflare.yml`）で読み取り専用のトークンを使って走る。
- トリガーを変えるときは、管理画面で変えてから `builds.json` を同じ内容に直す（適用の仕組みは段階 4 で足す）。同じアカウントの `shisetsu-` 以外の Worker には触れない。

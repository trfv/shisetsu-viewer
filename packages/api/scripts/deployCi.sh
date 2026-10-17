#!/bin/sh
# Workers Builds（master）の deploy コマンド。トリガー設定から `npm run deploy:ci -w @shisetsu-viewer/api` で呼ぶ。
# 1. 未適用の D1 マイグレーションを当てる（無ければ何もしない）。新しい列を読む api より必ず先に当てるため
# 2. 版タグにコミット SHA の先頭 12 桁を付けてデプロイする。/v1/health がこのタグを返し、
#    Database ワークフローは自分のコミットの api が出るまでこれを見て待つ
set -eu
: "${WORKERS_CI_COMMIT_SHA:?Workers Builds の外では使わない（手元は npm run migrate:remote と npm run deploy）}"
TAG=$(printf '%.12s' "$WORKERS_CI_COMMIT_SHA")
npx wrangler d1 migrations apply shisetsu-db --remote
npx wrangler deploy --tag "$TAG"

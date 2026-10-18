#!/bin/sh
# マイグレーションは新しい列を読む api より必ず先に当てる。
# 版タグは /v1/health が返し、Database ワークフローが自分のコミットの api を待つのに使う
set -eu
: "${WORKERS_CI_COMMIT_SHA:?Workers Builds の外では使わない（手元は npm run migrate:remote と npm run deploy）}"
TAG=$(printf '%.12s' "$WORKERS_CI_COMMIT_SHA")
npx wrangler d1 migrations apply shisetsu-db --remote
npx wrangler deploy --tag "$TAG"

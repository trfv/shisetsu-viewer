# tokyo-sumida の国内 proxy 経由スクレイプ（Tailscale）の設計

- 日付: 2026-07-19
- ステータス: 設計承認済み・未実装
- 対象パッケージ: `packages/shared`、`packages/scraper`、`.github`（workflow と composite action）
- 対象自治体: `tokyo-sumida`

## 背景と目的

tokyo-sumida の予約サイト（`yoyaku03.city.sumida.lg.jp`）は、GitHub Actions ランナーからの TCP SYN をファイアウォールで silent drop している。
2026-07-19 の検証で、次の事実を確定させた。

- 同一ランナーから同一分内に試すと、sumida（122.208.61.24）は 443 番への TCP 接続が 10〜20 秒無応答でタイムアウトし、同じ /24 の bunkyo（122.208.61.19）は TCP、TLS、HTTP/2 200 まですべて成功する
- Anthropic の米国データセンター経由（WebFetch）では正常に 200 が返る。つまり米国 IP の一律遮断ではなく、GitHub Actions（Azure）を含む特定レンジの遮断である
- ローカル（住宅 IP）では 4 施設すべてのスクレイプが成功する。サイト構造は無傷である

registry の `scraperCiExcluded: true` に付されたコメント「サイト構造変化で故障中」は、この検証結果と食い違っており、実態は接続元 IP による遮断である。
遮断は sumida サーバー個別の設定であり、GitHub Actions 側の設定変更では回避できない。

### ゴール

1. sumida のデータ更新を他自治体と同じ定期実行（1 日 2 回）に戻す
2. 追加費用をかけない
3. 公開リポジトリに新たな攻撃面を作らない

### 前提

- 開発者の Mac を常時稼働させてよい（確認済み）
- Tailscale の無料プランを利用する

## 検討した代替案

**Mac での launchd ローカル実行**：CI の外で launchd により定期実行し、Hasura と D1 へローカルからアップロードする案。
外部依存を増やさない点は勝るが、専用 clone、pmset の起床管理、ローカル用の D1 認証キー、失敗時の Issue 起票と、CI が既に持っている性質の再実装が並ぶ。
Mac を常時稼働させてよいという前提の下では、実行経路を二重化する理由がないため採用しない。

**self-hosted runner**：既存パイプラインを完全に流用できるが、本リポジトリは公開であり、公開リポジトリへの self-hosted runner 接続は GitHub 自身が非推奨としている。
fork PR が workflow を書き換えてランナーを標的にできる攻撃面が生じるため、採用しない。

**Oracle Cloud Always Free（ap-tokyo-1）の VM**：無料で常時稼働の国内データセンター IP を得られるが、データセンター IP が同様に遮断される可能性は未実測である。
将来 Mac 常時稼働をやめたくなったときの移行候補として残す。
なお当初候補にあった GCP 無料枠は、Always Free の VM が米国リージョン限定のため国内 IP の要件を満たさない。

採用するのは、CI のランナーを Tailscale で Mac につなぎ、sumida への通信だけを Mac（住宅 IP）経由で出す案である。
secrets、D1 の OIDC、retry、失敗キャプチャ、parity、スケジュールがすべて既存 CI のまま使え、住宅 IP のため再遮断のリスクも最も小さい。

## 全体構成

```
GitHub Actions (schedule / workflow_dispatch)
  └─ sumida の scrape ジョブのみ:
       ├─ tailscale/github-action で tailnet に ephemeral join（OAuth client）
       ├─ SCRAPER_PROXY=http://<Mac の MagicDNS 名>:8888 を設定
       └─ playwright.config.ts が SCRAPER_PROXY を browser proxy に適用
            → sumida への通信だけが Mac 経由で出る

Mac（常時稼働）
  ├─ tailscaled 常駐（無料プラン）
  └─ tinyproxy 常駐（brew services）
       - Tailscale インターフェースにのみ bind
       - Tailscale ACL で CI タグのノードからのみ到達可能
```

ジョブは自治体単位に分かれているため、proxy 設定は sumida のジョブに閉じる。
他自治体のジョブは今までどおり直接接続で走る。

## CI 側の変更

proxy の要否も registry を単一ソースとして扱う。

- `packages/shared/registry.ts` に `scraperViaJpProxy: true` のフラグを追加し、sumida の `scraperCiExcluded` を解除する。コメントも実態（GitHub Actions からの L4 遮断のため国内 proxy 経由）に改める
- `shardMatrix.ts` が matrix エントリにこのフラグを載せる
- scrape アクション（`.github/actions/scrape`）は、フラグ付きジョブでだけ Tailscale join のステップを実行し、`SCRAPER_PROXY` を設定する
- `playwright.config.ts` は `SCRAPER_PROXY` が設定されていれば `use.proxy` に渡す。未設定なら従来どおり

retry ジョブも同じ scrape アクションを通るため、追加の対応なしで proxy 経由になる。

## Mac 側の構成

- tailscaled を常駐させる（未導入ならインストール）
- tinyproxy を brew でインストールし、`brew services` で常駐させる
- tinyproxy は Tailscale インターフェースの IP にのみ bind し、許可元も tailnet の CIDR（100.64.0.0/10）に限定する。LAN とインターネットには露出しない

セットアップ手順（tinyproxy の設定例、Tailscale の OAuth client と ACL の設定例）は `packages/scraper/tools/jp-proxy/README.md` としてリポジトリに置く。

## セキュリティ

公開リポジトリであることを前提に、漏洩時の影響を「proxy 経由の閲覧」までに限定する。

- CI は Tailscale の **OAuth client + タグ + ephemeral node** で join する。ノードはジョブ終了後に自動で消える
- Tailscale ACL で、CI タグのノードは Mac の proxy ポート（8888）にしか到達できないよう絞る。Mac の他のポートや tailnet の他機器には届かない
- OAuth client secret はリポジトリ secrets に置く。GitHub の仕様上、fork PR には secrets が渡らない
- 万一 secret が漏れた場合も、できることは住宅 IP 経由の Web 閲覧までで、OAuth client の失効で即座に遮断できる

## 失敗モード

Mac がオフライン、または tinyproxy が停止しているときは、sumida のジョブが接続タイムアウト（transient 分類）で失敗する。
retry 込みで落ちれば run が赤くなり、GitHub の通知で気付ける。
transient 分類の失敗が tracker Issue に載らない既知の課題は残るが、これは他自治体の一過性失敗と共通の性質であり、本設計では扱わない（スコープ外に記載）。

proxy 経由になることで 1 リクエストあたりの遅延は増えるが、sumida は 4 施設（1 シャード）であり、実行時間への影響は許容範囲と見込む。
実測はテスト計画で行う。

## テスト計画

1. Mac 側を構成し、手元から `SCRAPER_PROXY` を指定して sumida のテストが通ることを確認する（proxy 単体の検証）
2. ブランチ上で workflow_dispatch により sumida を CI 実行し、Tailscale join、proxy 経由のスクレイプ、Hasura と D1 へのアップロードまで通ることを確認する
3. `scraperCiExcluded` 解除後の定期実行 1 スロットを観察し、他自治体への影響がないこと、実行時間が許容範囲であることを確認する
4. 異常系として tinyproxy を止めた状態で dispatch し、transient 失敗として retry に回ることを確認する

## スコープ外

- transient 分類の失敗が tracker Issue に載らない問題の一般的な改善（sumida 以外にも関わるため別課題とする）
- Oracle Cloud（ap-tokyo-1）からの到達性実測と、Mac 常時稼働をやめる場合の VM 移行
- 杉並区（Cloudflare Turnstile）のような、IP 以外の要因で CI 除外されている自治体への適用

# 国内 proxy（Cloudflare Tunnel + tinyproxy）のセットアップ

tokyo-sumida はサイト側が GitHub Actions からの接続を L4 で遮断しているため、
CI は Cloudflare Tunnel で Mac の tinyproxy に接続し、住宅 IP からスクレイプする。
設計: `docs/superpowers/specs/2026-07-19-sumida-jp-proxy-design.md`

Cloudflare が担うのは「CI ランナーから Mac の 8888 番へ到達する経路」だけである。
住宅 IP から出るという肝心の性質は、従来どおり Mac の tinyproxy と自宅 ISP が担う。

```
GH Actions runner
  └─ cloudflared access tcp（ローカル 127.0.0.1:8888 で待受）
       └─ Cloudflare edge（Access の service token で認可）
            └─ Mac の cloudflared
                 └─ tinyproxy 127.0.0.1:8888
                      └─ 自宅 ISP → yoyaku03.city.sumida.lg.jp
```

## Mac 側

1. tinyproxy を入れて設定する:

   ```bash
   brew install tinyproxy
   ```

   `$(brew --prefix)/etc/tinyproxy/tinyproxy.conf` を次の内容にする
   （loopback にのみ bind する。外部からの到達は cloudflared だけが担う）:

   ```
   Port 8888
   Listen 127.0.0.1
   Timeout 600
   MaxClients 20
   Allow 127.0.0.1
   # 宛先制限: 万一 Access を突破されても、この proxy は対象サイトへの閲覧以外
   # （localhost / LAN への CONNECT 含む）に使えない
   FilterDefaultDeny Yes
   Filter "/opt/homebrew/etc/tinyproxy/filter"
   ConnectPort 443
   ```

   filter ファイル（`/opt/homebrew/etc/tinyproxy/filter`）には許可する宛先を
   アンカー付き正規表現で 1 行ずつ書く（substring マッチだと
   `...sumida.lg.jp.evil.com` のような偽装宛先がすり抜けるため）:

   ```
   ^yoyaku03\.city\.sumida\.lg\.jp$
   ```

   proxy 経由の自治体を増やすときは、この filter に 1 行追加する。

2. 常駐させる: `brew services start tinyproxy`
3. 動作確認（Mac 自身から）:

   ```bash
   curl -x http://127.0.0.1:8888 -s -o /dev/null -w "%{http_code}\n" \
     https://yoyaku03.city.sumida.lg.jp/user/Home
   ```

   → `200`

4. cloudflared を入れる: `brew install cloudflared`
5. Cloudflare 側（次節）で Tunnel を作ってトークンを取得したら、コネクタを常駐させる:

   ```bash
   sudo cloudflared service install <トークン>
   ```

   macOS では `/Library/LaunchDaemons/com.cloudflare.cloudflared.plist` に
   root の LaunchDaemon として登録され、トークンは
   `/Library/Application Support/com.cloudflare.cloudflared/token` に置かれる。

   **常駐の強さが tinyproxy と非対称である点に注意する。** cloudflared は
   LaunchDaemon なのでログインセッションに依存しないが、tinyproxy は
   brew services の LaunchAgent なのでログアウトすると止まる。この状態では
   Tunnel は healthy のままなので CI の preflight は通過し、Playwright だけが
   `ERR_PROXY_CONNECTION_FAILED` で落ちる。

   状態確認: `sudo launchctl list | grep cloudflared`、`lsof -nP -iTCP:8888 -sTCP:LISTEN`

## Cloudflare 側

ゾーン `shisetsudb.com` と Zero Trust 組織は既存のものを使う。Zero Trust の
無料プラン（50 seats）の範囲に収まり、追加費用は発生しない。

1. **Tunnel を作る**（ダッシュボード → Networking → Tunnels）:
   - 種別は `cloudflared`、名前は `jp-proxy`
   - 表示されるインストールコマンドのトークンを控え、Mac 側の手順 5 で使う

2. **ルートを追加する**（作った Tunnel → ルート タブ → ルートを追加 → **公開アプリケーション**）:
   - Subdomain `jp-proxy` / Domain `shisetsudb.com`
   - Service URL に **`tcp://127.0.0.1:8888`**

   Service URL のスキームは `http://` ではなく **`tcp://`** である。HTTP にすると
   cloudflared がリクエストを HTTP として解釈して転送するため、CI 側の
   `cloudflared access tcp` が張る生の TCP ストリーム（tinyproxy への CONNECT）が壊れる。

   DNS の CNAME（`jp-proxy` → `<Tunnel UUID>.cfargotunnel.com`）は自動で作られる。

3. **Access アプリケーションを作る**（Zero Trust → Access → Applications）:
   - 種別 Self-hosted、ドメイン `jp-proxy.shisetsudb.com`
   - これを付けないと、ホスト名を知っている誰でも `cloudflared access tcp` で
     この proxy を使えてしまう。宛先は tinyproxy の filter で sumida に限定されて
     いるとはいえ、住宅 IP を第三者に貸すことになる

4. **service token を作る**（Zero Trust → Access controls → Service credentials → Service Tokens）:
   - 名前は `github-actions-scraper` など
   - **Client Secret は生成時にしか表示されない**ので、その場で控える
   - 有効期限（Service Token Duration）を設定した場合、失効時は CI の preflight が
     `HTTP 403` で落ちる

5. **手順 3 のアプリに Service Auth ポリシーを付ける**:
   - Action は **Service Auth**。Allow にすると ID プロバイダのログインを要求され、
     CI からは通らない
   - Include に手順 4 の service token を指定する

## GitHub 側

```bash
gh secret set CF_ACCESS_CLIENT_ID --repo trfv/shisetsu-viewer
gh secret set CF_ACCESS_CLIENT_SECRET --repo trfv/shisetsu-viewer
gh variable set JP_PROXY_HOSTNAME --repo trfv/shisetsu-viewer --body "jp-proxy.shisetsudb.com"
```

`JP_PROXY_HOSTNAME` はスキームもポートも付けないホスト名だけを入れる。
CI 側の proxy URL（`SCRAPER_PROXY`）は `http://127.0.0.1:8888` 固定であり、
リポジトリ変数にはしない。

## 故障の切り分け

scrape ジョブの `Open JP proxy tunnel` ステップが、経路のどこが切れているかを
Playwright に到達する前に確定させる。

preflight は正常時に `HTTP 200` を返す。それ以外はステップがその場で落ちる。

| 症状 | 原因 | 対処 |
| --- | --- | --- |
| `HTTP 530`（Cloudflare error 1033） | Mac が停止・スリープ、または cloudflared が落ちている | Mac を起動し `sudo launchctl list \| grep cloudflared` を確認 |
| `HTTP 403` | service token の失効・値の誤り、または Service Auth ポリシー不整合 | Client ID が Access API の値と一致しているか確認し、Secret を再設定する |
| listener が 30 秒以内に起動しない | CI 側 cloudflared の起動失敗 | 同ジョブの `Dump JP proxy tunnel log` ステップの出力を見る |
| Playwright が `ERR_PROXY_CONNECTION_FAILED` | preflight は通ったが tinyproxy が落ちている、または宛先が filter で拒否された | Mac で `brew services list` と `/opt/homebrew/etc/tinyproxy/filter` を確認 |

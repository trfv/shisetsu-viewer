# 国内 proxy（Tailscale + tinyproxy）のセットアップ

tokyo-sumida はサイト側が GitHub Actions からの接続を L4 で遮断しているため、
CI は Tailscale で Mac の tinyproxy に接続し、住宅 IP からスクレイプする。
設計: `docs/superpowers/specs/2026-07-19-sumida-jp-proxy-design.md`

## Mac 側

1. Tailscale をインストールしてログインする（App 版または `brew install tailscale`）
2. Tailscale の IPv4 を確認する: `tailscale ip -4`（以下 `<TS_IP>`）
3. tinyproxy を入れて設定する:

   ```bash
   brew install tinyproxy
   ```

   `$(brew --prefix)/etc/tinyproxy/tinyproxy.conf` を次の内容にする
   （Tailscale IF にのみ bind し、tailnet からのみ許可）:

   ```
   Port 8888
   Listen <TS_IP>
   Timeout 600
   MaxClients 20
   Allow 100.64.0.0/10
   ```

4. 常駐させる: `brew services start tinyproxy`
5. 動作確認（Mac 自身から Tailscale IF 経由で）:

   ```bash
   curl -x http://<TS_IP>:8888 -s -o /dev/null -w "%{http_code}\n" \
     https://yoyaku03.city.sumida.lg.jp/user/Home
   ```

   → `200`

## Tailscale 管理画面

1. **タグ定義とアクセス制御**（Access Controls。現行の管理画面は grants 構文）:

   ```jsonc
   "tagOwners": { "tag:ci": ["autogroup:admin"] },
   "grants": [
     // 自分のデバイス同士は従来どおり全許可（タグ付きノードは含まれない）
     {"src": ["autogroup:member"], "dst": ["*"], "ip": ["*"]},
     // CI ノードは Mac の proxy ポートにのみ到達できる
     {"src": ["tag:ci"], "dst": ["<TS_IP>"], "ip": ["tcp:8888"]},
   ],
   ```

   既定の `{"src": ["*"], "dst": ["*"], "ip": ["*"]}` は tag:ci にも全アクセスを許すため、
   `autogroup:member` に絞り替える。

2. **OAuth client**（Settings → Trust credentials → Credential → OAuth）:
   scope は Auth Keys の Write、タグは `tag:ci` を割り当てる。
   Client Secret は生成時にしか表示されないため、その場で控える

## GitHub 側

```bash
gh secret set TS_OAUTH_CLIENT_ID --repo trfv/shisetsu-viewer
gh secret set TS_OAUTH_SECRET --repo trfv/shisetsu-viewer
gh variable set JP_PROXY_URL --repo trfv/shisetsu-viewer --body "http://<TS_IP>:8888"
```

`JP_PROXY_URL` は MagicDNS 名ではなく Tailscale IP を使う
（ephemeral ノードの DNS 解決に依存しないため）。

## 運用

- Mac は常時稼働・AC 接続とする
- proxy 停止時は sumida のジョブが transient 失敗し、retry 込みで落ちると run が赤くなる
- 停止・再開: `brew services stop|start tinyproxy`

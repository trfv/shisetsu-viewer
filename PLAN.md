# 自動予約サービス実装計画

## ビジョン
空き状況の閲覧から予約実行までをワンストップで完結させる。Google Hotels/Flightsのように「検索 → 比較 → 予約」の体験を提供する。

## PoC対象: 江東区（KCF - 江東区文化センター予約システム）

---

## Phase 1: 共通基盤（shared パッケージ）

### 1-1. 予約関連の型定義を追加 (`packages/shared/booking.ts`)

```typescript
// 予約リクエスト
export type BookingRequest = {
  municipalitySlug: string;
  institutionId: string;
  date: string; // ISO format
  division: ReservationDivision;
  credentials: MunicipalCredentials;
  purpose?: string;
};

// 自治体サイトのログイン情報
export type MunicipalCredentials = {
  loginId: string;
  password: string;
};

// 予約結果
export type BookingResult = {
  status: "success" | "failed" | "already_booked" | "not_available" | "auth_failed" | "error";
  message: string;
  confirmationId?: string;
  details?: Record<string, string>;
};

// 予約ステップ（進捗追跡用）
export type BookingStep =
  | "authenticating"
  | "navigating"
  | "selecting"
  | "confirming"
  | "completed"
  | "failed";

// 予約モジュールインターフェース（ScraperModuleと対をなす）
export interface BookingModule<Page = unknown> {
  login(page: Page, credentials: MunicipalCredentials): Promise<Page>;
  book(page: Page, request: BookingRequest): Promise<BookingResult>;
}
```

### 1-2. shared/index.ts からエクスポート

---

## Phase 2: 予約自動化エンジン（scraper パッケージ内）

### 2-1. 江東区予約モジュール (`packages/scraper/tokyo-koutou/booking.ts`)

既存の `prepare()` フローをベースに、ログイン→施設選択→予約実行のフローを実装。

**KCFサイトの予約フロー（推定）:**
1. `https://www.kcf.or.jp/yoyaku/shisetsu/` にアクセス
2. 利用規約に同意
3. 「施設を予約する・空き状況を見る」→ ポップアップ
4. **ログイン**（既存scraperではスキップしている部分）
5. 施設選択 → 日付選択 → 時間帯選択
6. 予約確認 → 確定

**実装内容:**
- `login(page, credentials)`: KCFログイン画面でID/パスワード入力
- `selectFacility(page, building, room, date, division)`: 既存prepare()ロジックを活用し予約対象を選択
- `submitBooking(page)`: 予約フォーム送信・確認
- `book(page, request)`: 上記を組み合わせた一連のフロー

### 2-2. 予約テスト (`packages/scraper/tokyo-koutou/booking.test.ts`)

Playwrightテストとして実装。認証情報は環境変数から読み込み。
手動実行のみ（CIでは実行しない）。

---

## Phase 3: Viewer UI

### 3-1. 予約ボタンの追加

**施設詳細ページ (`pages/Detail.tsx`) の予約状況タブ:**
- 空き（VACANT）のセルに「予約する」ボタンを追加
- ボタンクリックで予約ダイアログを開く

**予約検索ページ (`pages/Reservation.tsx`):**
- 検索結果の各行に「予約」ボタン列を追加
- 空きのある行のみボタンを有効化

### 3-2. 予約ダイアログ (`components/BookingDialog/`)

ステップ形式のダイアログ:

1. **確認ステップ**: 施設名、日付、時間帯、料金を表示
2. **認証ステップ**: 自治体サイトのログインID/パスワード入力
   - 「この端末に保存」オプション（localStorage、暗号化）
3. **実行ステップ**: プログレス表示（BookingStep に対応）
4. **結果ステップ**: 成功/失敗メッセージ、予約番号

### 3-3. 予約APIクライアント (`api/bookingClient.ts`)

予約リクエストをバックエンドに送信するクライアント。

### 3-4. 新規ルート: `/booking/:institutionId` （オプション）

予約専用ページ。ダイアログではなくフルページでの予約フローも検討。

---

## Phase 4: バックエンドAPI（将来）

### 課題
- Playwrightはブラウザ上では動作しない → サーバーサイド実行が必須
- 現在のviewerはCloudflare Workers (SPA) でサーバーサイドロジックがない
- Hasuraは GraphQL CRUD のみで、カスタムロジックを実行できない

### 選択肢
1. **Cloudflare Workers + Browser Rendering API** — Cloudflareのヘッドレスブラウザで予約実行
2. **専用Node.jsサーバー** — Playwright実行環境として独立サーバーを構築
3. **キューベース** — 予約リクエストをキューに入れ、ワーカーが処理

→ PoC段階ではCLIベース（ローカルPlaywright実行）で検証し、Phase 4で本番アーキテクチャを決定。

---

## 今回の実装スコープ

| # | 内容 | パッケージ |
|---|------|-----------|
| 1 | 予約関連の型定義・インターフェース | shared |
| 2 | 江東区の BookingModule 実装 | scraper |
| 3 | 予約テスト（Playwright） | scraper |
| 4 | Viewer: 予約ボタン追加（空きセルに表示） | viewer |
| 5 | Viewer: BookingDialog コンポーネント | viewer |
| 6 | Viewer: 予約APIクライアント（モック対応） | viewer |

**注意**: Phase 4（サーバーサイド実行基盤）は今回のスコープ外。Viewerの予約UIはモックAPIで動作検証する。

---

## セキュリティ考慮事項

- 自治体サイトのログイン情報はサーバーに永続化しない（セッション中のみメモリ保持）
- ViewerでのlocalStorage保存はオプション、ユーザー明示同意が必要
- HTTPS必須（既にCloudflare Workersで確保済み）
- 予約実行のレート制限（同一施設・時間帯への連続リクエスト防止）

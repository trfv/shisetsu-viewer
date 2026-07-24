export const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN as string;
export const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID as string;
// API のベース URL。VITE_API_ENDPOINT で上書き可（ローカルや将来のドメイン変更用）。
// 公開エンドポイントでありシークレットではないため、ビルド変数未設定でも壊れないよう
// 本番既定値を持たせる（未設定だと自オリジンの index.html を掴んで白画面になるため）。
// PR3-5 のカットオーバーで既定値を https://api.shisetsudb.com へ切り替える。
export const API_ENDPOINT =
  (import.meta.env.VITE_API_ENDPOINT as string | undefined) || "https://d1-api.shisetsudb.com";
export const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE as string;

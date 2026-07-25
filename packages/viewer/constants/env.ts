export const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN as string;
export const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID as string;
// API のベース URL。値はリポジトリに置かず Cloudflare Workers Builds のビルド変数
// VITE_API_ENDPOINT で供給する（Vite がビルド時に埋め込む）。
export const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT as string;
export const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE as string;

/// <reference types="vite/client" />

declare module "@fontsource-variable/noto-sans-jp";

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

// BFF 化により VITE_* のビルド変数は不要になった。API は同一オリジンの /api、
// 認証は Worker 側の Secret で完結する。

declare module "process" {
  global {
    namespace NodeJS {
      interface ProcessEnv {
        readonly CI?: number;
      }
    }
  }
}

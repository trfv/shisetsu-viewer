/// <reference types="vite/client" />

declare module "@fontsource-variable/noto-sans-jp";

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

declare module "process" {
  global {
    namespace NodeJS {
      interface ProcessEnv {
        readonly CI?: number;
      }
    }
  }
}

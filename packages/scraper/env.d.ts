declare module "process" {
  global {
    namespace NodeJS {
      interface ProcessEnv {
        readonly ADMIN_API_KEY?: string;
        readonly CI?: number;
        readonly D1_API_ENDPOINT?: string;
        readonly SLOW_MO?: string;
        readonly WORKERS?: string;
      }
    }
  }
}

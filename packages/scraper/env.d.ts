declare module "process" {
  global {
    namespace NodeJS {
      interface ProcessEnv {
        readonly CI?: number;
        readonly GRAPHQL_ENDPOINT?: string;
        readonly ADMIN_SECRET?: string;
        readonly SCRIPT_ENDPOINT?: string;
        readonly SLOW_MO?: string;
        readonly WORKERS?: string;
      }
    }
  }
}

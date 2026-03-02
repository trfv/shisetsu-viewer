declare module "process" {
  global {
    namespace NodeJS {
      interface ProcessEnv {
        readonly CI?: number;
        readonly GRAPHQL_ENDPOINT?: string;
        readonly AUTH0_DOMAIN?: string;
        readonly AUTH0_CLIENT_ID?: string;
        readonly AUTH0_CLIENT_SECRET?: string;
        readonly AUTH0_AUDIENCE?: string;
        readonly M2M_TOKEN?: string;

        readonly SLOW_MO?: string;
        readonly WORKERS?: string;
      }
    }
  }
}

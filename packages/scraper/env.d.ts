declare module "process" {
  global {
    namespace NodeJS {
      interface ProcessEnv {
        readonly CI?: number;
      }
    }
  }
}

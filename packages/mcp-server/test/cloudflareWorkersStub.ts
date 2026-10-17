// workers-oauth-provider は handler が WorkerEntrypoint のサブクラスかを判定するためだけに
// cloudflare:workers を import する。素の Node のテストではこの空クラスで足りる。
// oxlint-disable-next-line typescript/no-extraneous-class
export class WorkerEntrypoint {}

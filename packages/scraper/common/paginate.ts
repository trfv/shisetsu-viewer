/**
 * collectPaginated がページ送りを途中で打ち切ったときの記録。
 * 打ち切り自体は resilience（部分結果を保存）として許容するが、
 * 「なぜ打ち切ったか」を可観測にして partial-extraction 検出や修復に役立てる。
 */
export interface PaginationTruncation {
  readonly label: string;
  readonly page: number;
  readonly phase: "extract" | "goNext";
  readonly message: string;
}

// Playwright は 1 worker プロセス内でテストを逐次実行するため、モジュールグローバルで安全。
let truncationBuffer: PaginationTruncation[] = [];

/** 蓄積された打ち切りイベントを消去する（各テストの開始時に呼ぶ）。 */
export function resetPaginationEvents(): void {
  truncationBuffer = [];
}

/** 蓄積された打ち切りイベントを取り出してバッファを空にする。 */
export function drainPaginationEvents(): PaginationTruncation[] {
  const events = truncationBuffer;
  truncationBuffer = [];
  return events;
}

export interface PaginateOptions<Item> {
  /** ページ送り回数の上限（HorizonSpec から計算した値を渡す） */
  maxPages: number;
  /**
   * 現在のページからデータを抽出する。null を返すとそこで打ち切る
   * （同じページが再表示された等、「これ以上先が無い」ことを検知した場合）。
   * 抽出の throw は「ここまでの結果を保存して打ち切り」として扱う。
   */
  extractPage: (pageIndex: number) => Promise<Item[] | null>;
  /**
   * 次ページへ遷移する。次ページが存在しなければ false を返す。
   * throw は「ここまでの結果を保存して打ち切り」として扱う。
   */
  goNext: (pageIndex: number) => Promise<boolean>;
  /** 目標件数到達などの早期終了条件（日数ベースでカウントするサイト用） */
  isDone?: (collected: readonly Item[]) => boolean;
  /** 警告ログの識別子 */
  label?: string;
}

/**
 * 全スクレイパー共通のページ送りループ。
 * 「抽出 → 次ページ遷移」を maxPages 回繰り返し、途中の失敗は
 * 警告を出してそこまでの結果を返す（部分結果は partial extraction 検出で拾う）。
 */
export async function collectPaginated<Item>(opts: PaginateOptions<Item>): Promise<Item[]> {
  const label = opts.label ?? "paginate";
  const collected: Item[] = [];

  for (let i = 0; i < opts.maxPages; i++) {
    let items: Item[] | null;
    try {
      items = await opts.extractPage(i);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      truncationBuffer.push({ label, page: i + 1, phase: "extract", message });
      console.warn(`[${label}] Failed to extract data at page ${i + 1}, saving current output.`);
      break;
    }
    if (items === null) break;
    collected.push(...items);

    if (opts.isDone?.(collected)) break;
    if (i + 1 >= opts.maxPages) break;

    let moved: boolean;
    try {
      moved = await opts.goNext(i);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      truncationBuffer.push({ label, page: i + 1, phase: "goNext", message });
      console.warn(`[${label}] Failed to navigate to next page at page ${i + 1}.`);
      break;
    }
    if (!moved) break;
  }

  return collected;
}

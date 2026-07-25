// spot check の区分同定を「時刻の独立解釈」だけで行うための純関数。
// scraper の DIVISION_MAP は参照しない。参照すると変換テーブルの誤りを
// 判定器が再現してしまい、silent failure 検出器としての独立性を失うため。
// 根拠にしてよいのは「サイトが表示する時刻そのもの」と「registry 由来の enum 識別子」だけ。

export type Band = "morning" | "afternoon" | "evening";

const DIVISION_PREFIX = "RESERVATION_DIVISION_";

/**
 * 時間帯レンジ表記を正規化する。全角数字→半角、全角コロン→半角、
 * 各種ダッシュ・波ダッシュ→ "-"、空白と改行は全除去。
 * 荒川区は "09:00\n～\n12:00"、大田区は "09:00 - 12:00"、中央区は "9:00-12:00" と
 * 同じ意味を三者三様に書くため、比較の前に一つの形へ寄せる。
 */
function normalizeRange(label: string): string {
  return label
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
    .replace(/：/g, ":")
    .replace(/[～〜\-−ー]/g, "-")
    .replace(/\s+/g, "");
}

// 片側だけの "9:00" を弾くため、レンジ全体（開始と終了）の形を要求する。
// 「午前」「午後1」のような抽象ラベルを誤って時刻と解釈しないための門番。
const RANGE_PATTERN = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/;

/**
 * 時間帯レンジ表記から開始時（0-23）を返す。レンジとして読めなければ null。
 * null は「band モードに入れない／想定外」の合図であり、judge 側で UNMAPPED になる。
 */
export function parseStartHour(label: string): number | null {
  const matched = RANGE_PATTERN.exec(normalizeRange(label));
  if (!matched) return null;
  const hour = Number(matched[1]);
  const minute = Number(matched[2]);
  const endHour = Number(matched[3]);
  const endMinute = Number(matched[4]);
  if (hour > 23 || minute > 59 || endHour > 23 || endMinute > 59) return null;
  return hour;
}

/**
 * 開始時から band を決める。境界（12 / 17）は 3 自治体の実データで
 * enum 名由来の band と矛盾しないことを確認した固定値。
 */
export function bandFromHour(hour: number): Band {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

/**
 * 区分 enum 名から band を決める。MORNING* / AFTERNOON* / EVENING* の接頭辞だけを根拠にする。
 * 北区の DIVISION_1..5 のように名前に時間帯の意味が無いものと、変換失敗の INVALID は
 * null を返す。null を「とりあえず morning」等に丸めると異常が判定から消えるため、
 * 呼び出し側で UNMAPPED に落とす。
 */
export function bandFromDivisionEnum(division: string): Band | null {
  if (!division.startsWith(DIVISION_PREFIX)) return null;
  const name = division.slice(DIVISION_PREFIX.length);
  if (name.startsWith("MORNING")) return "morning";
  if (name.startsWith("AFTERNOON")) return "afternoon";
  if (name.startsWith("EVENING")) return "evening";
  return null;
}

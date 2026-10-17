import { MUNICIPALITIES } from "@shisetsu-viewer/shared";
import { z } from "zod";

/** 複数のクエリで共通する入力スキーマの部品。MCP ツールと CLI の両方がこれで検証する。 */

export const MUNICIPALITY_HELP = Object.values(MUNICIPALITIES)
  .map((config) => `${config.key} (${config.label})`)
  .join(", ");

export const INSTITUTION_SIZE_HELP =
  "INSTITUTION_SIZE_LARGE (100人以上), INSTITUTION_SIZE_MEDIUM (50〜99人), INSTITUTION_SIZE_SMALL (50人未満)";

// 施設 ID には RFC 4122 非準拠の UUID が含まれる (version/variant ビットが不正な ID が
// toshima/edogawa/bunkyo/kita に計 17 件)。z.string().uuid() は RFC 厳格検証でこれらを
// 弾くため、viewer の isValidUuid と同じ 8-4-4-4-12 の hex 形式のみを検証する。
export const institutionIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const municipalitySchema = z
  .array(z.string())
  .optional()
  .describe(`自治体キーでフィルタ。指定可能な値: ${MUNICIPALITY_HELP}`);

export const institutionSizesSchema = z
  .array(z.string())
  .optional()
  .describe(`施設サイズでフィルタ。指定可能な値: ${INSTITUTION_SIZE_HELP}`);

// クライアントによっては真偽値を "true" の文字列で送ってくるので、文字列も受けて boolean に揃える
const flag = (description: string) =>
  z.union([z.boolean(), z.stringbool()]).optional().describe(description);

/**
 * 楽器の利用可否フィルタ。API は「利用可のみ」の true フィルタだけを解釈するので、
 * false は指定なしと同じになる。
 */
export const instrumentFilterSchemas = {
  isAvailableStrings: flag("true で弦楽器が使える施設のみ"),
  isAvailableWoodwind: flag("true で木管楽器が使える施設のみ"),
  isAvailableBrass: flag("true で金管楽器が使える施設のみ"),
  isAvailablePercussion: flag("true で打楽器が使える施設のみ"),
};

/** true のときだけフィルタとして送り、false と未指定はフィルタなしに畳む */
export const onlyTrue = (value: boolean | undefined): true | undefined =>
  value === true ? true : undefined;

export const firstSchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .default(20)
  .describe("取得件数 (最大100、デフォルト20)");

export const afterSchema = z
  .string()
  .optional()
  .describe("ページネーション用カーソル (前回レスポンスの endCursor)");

/** 返却フィールドの選択。省略時は全フィールド。 */
export const fieldsSchema = <const T extends readonly [string, ...string[]]>(
  fields: T,
  label = "返却フィールドを指定しトークンを節約 (省略時は全フィールド)"
) =>
  z
    .array(z.enum(fields))
    .optional()
    .describe(`${label}。選択可能: ${fields.join(", ")}`);

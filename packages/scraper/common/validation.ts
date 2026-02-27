import type { TransformOutput } from "./types.ts";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * TransformOutputのデータ品質を検証する。
 * エラーがあれば文字列の配列で返す。空配列なら正常。
 */
export function validateTransformOutput(output: TransformOutput): string[] {
  const errors: string[] = [];
  for (const item of output) {
    if (!item.room_name) {
      errors.push(`Empty room_name for date ${item.date}`);
    }
    if (!ISO_DATE_RE.test(item.date)) {
      errors.push(`Invalid date format: "${item.date}" for room ${item.room_name}`);
    }
    if (Object.keys(item.reservation).length === 0) {
      errors.push(`Empty reservation for ${item.room_name} on ${item.date}`);
    }
  }
  return errors;
}

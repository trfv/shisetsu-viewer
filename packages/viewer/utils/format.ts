// 文字列が既にタイムゾーン情報（Z または ±HH:MM オフセット）を持つか。
// 持たない naive な datetime は UTC とみなして Z を補う。
const HAS_TZ = /(Z|[+-]\d{2}:?\d{2})$/;

/**
 * 文字列/Date を Date に変換する。文字列に datetime 用の Z 補完を行うかを appendZ で制御。
 * パース不能なら null（呼び出し側で空文字にフォールバック）。
 */
function toValidDate(value: string | Date, appendZ = false): Date | null {
  const date =
    typeof value === "string"
      ? new Date(appendZ && !HAS_TZ.test(value) ? `${value}Z` : value)
      : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

const monthDateFormat = new Intl.DateTimeFormat("ja-JP", {
  month: "long",
  day: "numeric",
  weekday: "narrow",
});

export const formatMonthDate = (date: string | Date): string => {
  const parsed = date ? toValidDate(date) : null;
  if (!parsed) {
    console.error("invalid date", date);
    return "";
  }
  return monthDateFormat.format(parsed);
};

const dateFormat = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "narrow",
});

export const formatDate = (date: string | Date | undefined): string => {
  const parsed = date ? toValidDate(date) : null;
  if (!parsed) {
    console.error("invalid date", date);
    return "";
  }
  return dateFormat.format(parsed);
};

const datetimeFormat = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export const formatDatetime = (datetime: string | Date | undefined): string => {
  // 文字列は naive（Z 無し）なら UTC とみなして Z を補う。Z / オフセット付きはそのまま。
  const parsed = datetime ? toValidDate(datetime, true) : null;
  if (!parsed) {
    console.error("invalid date", datetime);
    return "";
  }
  return datetimeFormat.format(parsed);
};

export const formatNumberWithCommas = (value: string | number): string => {
  if (value !== 0 && !value) {
    return "";
  }
  return Number(value).toLocaleString("ja-JP");
};

export const formatPrice = (value: string | number): string => {
  const formatted = formatNumberWithCommas(value);
  return formatted ? `¥${formatted}` : "";
};

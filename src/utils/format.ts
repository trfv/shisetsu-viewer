const monthDateFormat = new Intl.DateTimeFormat("ja-JP", {
  month: "long",
  day: "numeric",
  weekday: "narrow",
});

export const formatMonthDate = (date: string | Date): string => {
  if (!date) {
    console.error("invalid date");
    return date;
  }
  return monthDateFormat.format(typeof date === "string" ? new Date(date) : date);
};

const dateFormat = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "narrow",
});

export const formatDate = (date: string | Date): string => {
  if (!date) {
    console.error("invalid date");
    return date;
  }
  return dateFormat.format(typeof date === "string" ? new Date(date) : date);
};

const datetimeFormat = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export const formatDatetime = (datetime: string | Date): string => {
  if (!datetime) {
    console.error("invalid date");
    return datetime;
  }
  return datetimeFormat.format(typeof datetime === "string" ? new Date(`${datetime}Z`) : datetime);
};

export const formatNumberWithCommas = (value: string | number): string => {
  return Number(value).toLocaleString("ja-JP");
};

export const formatPrice = (value: string | number): string => {
  return `¥${formatNumberWithCommas(value)}`;
};

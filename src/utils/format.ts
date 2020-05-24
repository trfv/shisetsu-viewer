const datetimeFormat = new Intl.DateTimeFormat("ja-JP", {
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
  if (typeof date === "string") {
    return datetimeFormat.format(new Date(date));
  }
  return datetimeFormat.format(date);
};

export const formatNumberWithCommas = (value: string | number): string => {
  return Number(value).toLocaleString("ja-JP");
};

export const formatPrice = (value: string | number): string => {
  return `¥${formatNumberWithCommas(value)}`;
};

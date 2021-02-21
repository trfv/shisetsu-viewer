import { format } from "date-fns";

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

export const formatDatetime = (datetime: string | Date): string => {
  if (!datetime) {
    console.error("invalid date");
    return datetime;
  }
  return format(
    typeof datetime === "string" ? new Date(datetime) : datetime,
    "yyyy/MM/dd hh:mm:ss"
  );
};

export const formatNumberWithCommas = (value: string | number): string => {
  return Number(value).toLocaleString("ja-JP");
};

export const formatPrice = (value: string | number): string => {
  return `¥${formatNumberWithCommas(value)}`;
};

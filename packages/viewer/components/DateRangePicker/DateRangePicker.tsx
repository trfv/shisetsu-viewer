import { DayPicker, type DateRange } from "@daypicker/react";

import "@daypicker/react/style.css";
import { ja } from "@daypicker/react/locale";
import { differenceInCalendarDays, isSameDay } from "date-fns";
import { useState, type FC } from "react";

import { formatMonthDate } from "../../utils/format";
import { SmallLabel } from "../Label";

import styles from "./DateRangePicker.module.css";

export type DateRangeValue = { from: Date; to: Date };

type Props = {
  label: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  minDate: Date;
  maxDate: Date;
};

const summarize = (value: DateRangeValue) =>
  isSameDay(value.from, value.to) ? (
    formatMonthDate(value.from)
  ) : (
    <span>
      {`${formatMonthDate(value.from)} 〜 ${formatMonthDate(value.to)}`}
      <span className={styles["days"]}>
        {`（${differenceInCalendarDays(value.to, value.from) + 1}日間）`}
      </span>
    </span>
  );

// 1 タップ目でその日だけを選び、続けて 2 タップ目を押すとそこまでの期間になる。
// 開始日だけ決まった途中の状態はここで持ち、親には常に完結した範囲（1 日なら from = to）を渡す。
export const DateRangePicker: FC<Props> = ({ label, value, onChange, minDate, maxDate }) => {
  const [draft, setDraft] = useState<DateRange | null>(null);
  // 外から値が変わった（チップの削除など）ときは途中の状態を捨てる
  const activeDraft =
    draft?.from && isSameDay(draft.from, value.from) && isSameDay(value.from, value.to)
      ? draft
      : null;

  const handleSelect = (range: DateRange) => {
    if (!range.from) {
      return;
    }
    setDraft(range.to ? null : range);
    onChange({ from: range.from, to: range.to ?? range.from });
  };

  return (
    <div className={styles["root"]}>
      <SmallLabel label={label} />
      <DayPicker
        className={styles["calendar"]!}
        defaultMonth={value.from}
        disabled={[{ before: minDate }, { after: maxDate }]}
        endMonth={maxDate}
        locale={ja}
        mode="range"
        modifiers={{ saturday: { dayOfWeek: [6] }, sunday: { dayOfWeek: [0] } }}
        modifiersClassNames={{ saturday: styles["saturday"]!, sunday: styles["sunday"]! }}
        onSelect={handleSelect}
        required
        resetOnSelect
        selected={activeDraft ?? value}
        startMonth={minDate}
      />
      <p aria-live="polite" className={styles["summary"]}>
        {summarize(value)}
        {activeDraft && <span className={styles["hint"]}>終了日を押すと期間を選べます</span>}
      </p>
    </div>
  );
};

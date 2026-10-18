import { DayPicker, type DateRange } from "@daypicker/react";

import "@daypicker/react/style.css";
import { ja } from "@daypicker/react/locale";
import { useState, type FC } from "react";

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

// 開始日だけ決まった途中の状態は親に渡さずここで持つ。Drawer は閉じるとアンマウントするので、
// 途中で閉じれば選ぶ前の期間に戻る。
export const DateRangePicker: FC<Props> = ({ label, value, onChange, minDate, maxDate }) => {
  const [draft, setDraft] = useState<DateRange | null>(null);

  const handleSelect = (range: DateRange) => {
    if (!range.from) {
      return;
    }
    if (!range.to) {
      setDraft(range);
      return;
    }
    setDraft(null);
    onChange({ from: range.from, to: range.to });
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
        selected={draft ?? value}
        startMonth={minDate}
      />
    </div>
  );
};

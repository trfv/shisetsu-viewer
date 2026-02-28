import { formatISO, parseISO } from "date-fns";
import type { ChangeEvent, FC } from "react";
import { SmallBox } from "../Box";
import styles from "./DatePicker.module.css";

type Props = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate: Date;
  maxDate: Date;
};

const toDateString = (date: Date | null): string =>
  date ? formatISO(date, { representation: "date" }) : "";

export const DatePicker: FC<Props> = ({ value, onChange, minDate, maxDate }) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val ? parseISO(val) : null);
  };

  return (
    <SmallBox>
      <input
        className={styles["datePicker"]}
        max={toDateString(maxDate)}
        min={toDateString(minDate)}
        onChange={handleChange}
        type="date"
        value={toDateString(value)}
      />
    </SmallBox>
  );
};

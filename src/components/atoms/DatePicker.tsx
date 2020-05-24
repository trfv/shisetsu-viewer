import DateFnsUtils from "@date-io/date-fns";
import { DatePicker as MuiDatePicker, MuiPickersUtilsProvider } from "@material-ui/pickers";
import React, { FC } from "react";

export type DatePickerProps = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date | null;
  maxDate?: Date | null;
};

const DatePicker: FC<DatePickerProps> = ({
  value,
  onChange,
  minDate,
  maxDate,
}: DatePickerProps) => {
  return (
    <MuiPickersUtilsProvider utils={DateFnsUtils}>
      <MuiDatePicker
        disableToolbar
        autoOk
        variant="inline"
        format="yyyy/MM/dd"
        value={value}
        onChange={onChange}
        minDate={minDate}
        maxDate={maxDate}
      />
    </MuiPickersUtilsProvider>
  );
};

export default DatePicker;

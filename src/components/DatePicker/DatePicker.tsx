import DateFnsUtils from "@date-io/date-fns";
import { DatePicker as MuiDatePicker, MuiPickersUtilsProvider } from "@material-ui/pickers";
import React, { FC } from "react";
import { SmallBox } from "../Box";

type DatePickerProps = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date | null;
  maxDate?: Date | null;
};

export const DatePicker: FC<DatePickerProps> = ({ value, onChange, minDate, maxDate }) => {
  return (
    <MuiPickersUtilsProvider utils={DateFnsUtils}>
      <SmallBox>
        <MuiDatePicker
          disableToolbar
          variant="inline"
          format="yyyy/MM/dd"
          value={value}
          onChange={onChange}
          minDate={minDate}
          maxDate={maxDate}
          error={false}
        />
      </SmallBox>
    </MuiPickersUtilsProvider>
  );
};

import MuiTextField from "@material-ui/core/TextField";
import { DatePicker as MuiDatePicker } from "@material-ui/lab";
import AdapterDateFns from "@material-ui/lab/AdapterDateFns";
import LocalizationProvider from "@material-ui/lab/LocalizationProvider";
import locale from "date-fns/locale/ja";
import React, { FC } from "react";
import { MediumBox } from "../Box";

type Props = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date | undefined;
  maxDate?: Date | undefined;
};

export const DatePicker: FC<Props> = ({ value, onChange, minDate, maxDate }) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} locale={locale}>
      <MediumBox>
        <MuiDatePicker
          views={["day"]}
          mask="yyyy/MM/dd"
          value={value}
          minDate={minDate}
          maxDate={maxDate}
          onChange={onChange}
          renderInput={(props) => <MuiTextField {...props} variant="standard" />}
          showDaysOutsideCurrentMonth={true}
        />
      </MediumBox>
    </LocalizationProvider>
  );
};

import AdapterDateFns from "@mui/lab/AdapterDateFns";
import MuiDatePicker from "@mui/lab/DatePicker";
import LocalizationProvider from "@mui/lab/LocalizationProvider";
import MuiTextField from "@mui/material/TextField";
import locale from "date-fns/locale/ja";
import { FC } from "react";
import { SmallBox } from "../Box";

type Props = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date | undefined;
  maxDate?: Date | undefined;
};

export const DatePicker: FC<Props> = ({ value, onChange, minDate, maxDate }) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} locale={locale}>
      <SmallBox>
        <MuiDatePicker
          views={["day"]}
          mask="____/__/__"
          value={value}
          minDate={minDate}
          maxDate={maxDate}
          onChange={onChange}
          renderInput={(props) => <MuiTextField {...props} variant="standard" />}
          showDaysOutsideCurrentMonth={true}
          ignoreInvalidInputs={true}
        />
      </SmallBox>
    </LocalizationProvider>
  );
};

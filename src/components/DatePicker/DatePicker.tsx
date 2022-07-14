import MuiTextField from "@mui/material/TextField";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker as MuiDatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import locale from "date-fns/locale/ja";
import type { FC } from "react";
import { useTheme } from "../../utils/theme";
import { SmallBox } from "../Box";

type Props = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate: Date;
  maxDate: Date;
};

export const DatePicker: FC<Props> = ({ value, onChange, minDate, maxDate }) => {
  const { breakpoints } = useTheme();
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={locale}>
      <SmallBox>
        <MuiDatePicker
          views={["day"]}
          mask="____/__/__"
          value={value}
          minDate={minDate}
          maxDate={maxDate}
          onChange={onChange}
          renderInput={(props) => (
            <MuiTextField {...props} variant="standard" style={{ fontSize: "16px" }} />
          )}
          showDaysOutsideCurrentMonth={true}
          ignoreInvalidInputs={true}
          desktopModeMediaQuery={breakpoints.up("sm")}
          showToolbar={false}
        />
      </SmallBox>
    </LocalizationProvider>
  );
};

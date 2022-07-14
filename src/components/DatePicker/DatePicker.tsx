import AdapterDateFns from "@mui/lab/AdapterDateFns";
import MuiDatePicker, { DatePickerProps } from "@mui/lab/DatePicker";
import LocalizationProvider from "@mui/lab/LocalizationProvider";
import MuiTextField from "@mui/material/TextField";
import locale from "date-fns/locale/ja";
import { FC } from "react";
import { useTheme } from "../../utils/theme";
import { SmallBox } from "../Box";
import { SmallButton } from "../Button";

type Props = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date | undefined;
  maxDate?: Date | undefined;
};

export const DatePicker: FC<Props> = ({ value, onChange, minDate, maxDate }) => {
  const { breakpoints } = useTheme();
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
          renderInput={(props: DatePickerProps<Date>) => (
            <MuiTextField {...props} variant="standard" style={{ fontSize: "16px" }} />
          )}
          showDaysOutsideCurrentMonth={true}
          ignoreInvalidInputs={true}
          desktopModeMediaQuery={breakpoints.up("sm")}
          okText={
            <SmallButton color="primary" variant="contained">
              確定
            </SmallButton>
          }
          cancelText={<SmallButton variant="outlined">キャンセル</SmallButton>}
        />
      </SmallBox>
    </LocalizationProvider>
  );
};

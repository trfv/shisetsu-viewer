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
    <LocalizationProvider
      dateAdapter={AdapterDateFns}
      dateFormats={{ monthAndYear: "yyyy/MM" }}
      adapterLocale={locale}
    >
      <SmallBox>
        <MuiDatePicker
          views={["day"]}
          value={value}
          minDate={minDate}
          maxDate={maxDate}
          onChange={onChange}
          slotProps={{
            field: { readOnly: true, selectedSections: "all" },
            textField: { variant: "standard", style: { fontSize: "16px" } },
            toolbar: { hidden: true },
            actionBar: { actions: ["accept"] },
          }}
          showDaysOutsideCurrentMonth={true}
          desktopModeMediaQuery={breakpoints.up("sm")}
          localeText={{ okButtonLabel: "閉じる" }}
        />
      </SmallBox>
    </LocalizationProvider>
  );
};

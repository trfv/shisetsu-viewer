import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker as MuiDatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import locale from "date-fns/locale/ja";
import type { FC } from "react";
import { SmallBox } from "../Box";

type Props = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate: Date;
  maxDate: Date;
};

export const DatePicker: FC<Props> = ({ value, onChange, minDate, maxDate }) => {
  return (
    <LocalizationProvider
      adapterLocale={locale}
      dateAdapter={AdapterDateFns}
      dateFormats={{ monthAndYear: "yyyy/MM" }}
    >
      <SmallBox>
        <MuiDatePicker
          localeText={{ okButtonLabel: "閉じる" }}
          maxDate={maxDate}
          minDate={minDate}
          onChange={onChange}
          showDaysOutsideCurrentMonth={true}
          slotProps={{
            field: { readOnly: true, selectedSections: "all" },
            textField: { variant: "standard" },
            toolbar: { hidden: true },
            actionBar: { actions: ["accept"] },
          }}
          value={value}
        />
      </SmallBox>
    </LocalizationProvider>
  );
};

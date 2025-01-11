import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3";
import { DatePicker as MuiDatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import type { FC } from "react";
import { SmallBox } from "../Box";
import { ja } from "date-fns/locale/ja";

type Props = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate: Date;
  maxDate: Date;
};

export const DatePicker: FC<Props> = ({ value, onChange, minDate, maxDate }) => {
  return (
    <LocalizationProvider adapterLocale={ja} dateAdapter={AdapterDateFns}>
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

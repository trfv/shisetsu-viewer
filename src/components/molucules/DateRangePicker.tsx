import Box from "@material-ui/core/Box";
import React, { FC } from "react";
import DatePicker, { DatePickerProps } from "../atoms/DatePicker";
import FormLabel from "../atoms/FormLabel";

type DateRangePickerProps = {
  label: string;
  startDateProps: DatePickerProps;
  endDateProps: DatePickerProps;
};

const DateRangePicker: FC<DateRangePickerProps> = ({
  label,
  startDateProps,
  endDateProps,
}: DateRangePickerProps) => {
  return (
    <>
      <FormLabel labelText={label} />
      <Box display="flex" alignItems="center">
        <DatePicker {...startDateProps} />
        <Box component="span" mx="4px">
          〜
        </Box>
        <DatePicker {...endDateProps} />
      </Box>
    </>
  );
};

export default DateRangePicker;

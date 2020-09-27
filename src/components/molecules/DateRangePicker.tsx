import React, { ComponentProps, FC } from "react";
import Box from "../atoms/Box";
import DatePicker from "../atoms/DatePicker";
import FormLabel from "../atoms/FormLabel";

type DatePickerProps = ComponentProps<typeof DatePicker>;

type DateRangePickerProps = {
  label: string;
  startDateProps: DatePickerProps;
  endDateProps: DatePickerProps;
};

const DateRangePicker: FC<DateRangePickerProps> = ({ label, startDateProps, endDateProps }) => {
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

import React, { ComponentProps, FC } from "react";
import { BaseBox, MiddleBox } from "../Box";
import { DatePicker } from "../DatePicker";
import { SmallLabel } from "../Label";

type DatePickerProps = ComponentProps<typeof DatePicker>;

type Props = {
  label: string;
  startDateProps: DatePickerProps;
  endDateProps: DatePickerProps;
};

export const DateRangePicker: FC<Props> = ({ label, startDateProps, endDateProps }) => {
  return (
    <MiddleBox display="flex" flexDirection="column">
      <SmallLabel label={label} />
      <MiddleBox display="flex" alignItems="center">
        <DatePicker {...startDateProps} />
        <BaseBox component="span" mx="4px">
          〜
        </BaseBox>
        <DatePicker {...endDateProps} />
      </MiddleBox>
    </MiddleBox>
  );
};

export default DateRangePicker;

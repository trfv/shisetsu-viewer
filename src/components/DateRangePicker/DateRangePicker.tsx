import React, { ComponentProps, FC } from "react";
import { BaseBox, LargeBox } from "../Box";
import { DatePicker } from "../DatePicker";
import { SmallLabel } from "../Label";
import { Spacer } from "../Spacer";

type DatePickerProps = ComponentProps<typeof DatePicker>;

type Props = {
  label: string;
  startDateProps: DatePickerProps;
  endDateProps: DatePickerProps;
};

export const DateRangePicker: FC<Props> = ({ label, startDateProps, endDateProps }) => {
  return (
    <LargeBox display="flex" flexDirection="column">
      <SmallLabel label={label} />
      <Spacer size={4} axis="vertical" />
      <LargeBox display="flex" alignItems="center">
        <DatePicker {...startDateProps} />
        <BaseBox component="span" mr="16px">
          〜
        </BaseBox>
        <DatePicker {...endDateProps} />
      </LargeBox>
    </LargeBox>
  );
};

export default DateRangePicker;

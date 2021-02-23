import React, { ComponentProps, FC } from "react";
import { BaseBox, MediumBox } from "../Box";
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
    <MediumBox display="flex" flexDirection="column">
      <SmallLabel label={label} />
      <Spacer size={4} axis="vertical" />
      <MediumBox display="flex" alignItems="center">
        <DatePicker {...startDateProps} />
        <BaseBox component="span" mx="4px">
          〜
        </BaseBox>
        <DatePicker {...endDateProps} />
      </MediumBox>
    </MediumBox>
  );
};

export default DateRangePicker;

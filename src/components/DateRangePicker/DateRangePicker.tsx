import type { ComponentProps, FC } from "react";
import { AutoBox, BaseBox } from "../Box";
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
    <AutoBox display="flex" flexDirection="column">
      <SmallLabel label={label} />
      <Spacer size={4} axis="vertical" />
      <AutoBox display="flex" alignItems="center">
        <DatePicker {...startDateProps} />
        <BaseBox component="span" mx="1rem">
          〜
        </BaseBox>
        <DatePicker {...endDateProps} />
      </AutoBox>
    </AutoBox>
  );
};

export default DateRangePicker;

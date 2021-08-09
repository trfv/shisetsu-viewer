import React, { ComponentProps } from "react";
import { DateRangePicker } from "./DateRangePicker";

type Props = ComponentProps<typeof DateRangePicker>;

export default {
  title: "DateRangePicker",
  component: DateRangePicker,
};

export const Basic = (args: Props) => <DateRangePicker {...args} />;

Basic.args = {
  label: "label",
  startDateProps: {
    value: new Date(2021, 0, 1),
  },
  endDateProps: {
    value: new Date(2021, 1, 1),
  },
};

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
};

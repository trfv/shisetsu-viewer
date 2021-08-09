import React, { ComponentProps } from "react";
import { DatePicker } from "./DatePicker";

type Props = ComponentProps<typeof DatePicker>;

export default {
  title: "DatePicker",
  component: DatePicker,
};

export const Basic = (args: Props) => <DatePicker {...args} />;

Basic.args = {
  label: "label",
  value: new Date(2021, 0, 1),
};

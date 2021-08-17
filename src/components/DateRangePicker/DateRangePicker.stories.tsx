import type { Meta, Story } from "@storybook/react";
import type { ComponentProps } from "react";
import { DateRangePicker } from "./DateRangePicker";

export default {
  title: "DateRangePicker",
  component: DateRangePicker,
} as Meta;

export const Basic: Story<ComponentProps<typeof DateRangePicker>> = (args) => (
  <DateRangePicker {...args} />
);

Basic.args = {
  label: "label",
  startDateProps: {
    value: new Date(2021, 0, 1),
    onChange: () => null,
  },
  endDateProps: {
    value: new Date(2021, 1, 1),
    onChange: () => null,
  },
};

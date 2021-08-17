import type { Meta, Story } from "@storybook/react";
import type { ComponentProps } from "react";
import { DatePicker } from "./DatePicker";

export default {
  title: "DatePicker",
  component: DatePicker,
} as Meta;

export const Basic: Story<ComponentProps<typeof DatePicker>> = (args) => <DatePicker {...args} />;

Basic.args = {
  value: new Date(2021, 0, 1),
};

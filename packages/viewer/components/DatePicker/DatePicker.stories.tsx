import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DatePicker } from "./DatePicker";

export default {
  component: DatePicker,
} as Meta<typeof DatePicker>;

export const Default: StoryObj<typeof DatePicker> = {
  args: {
    minDate: new Date(2020, 11, 1),
    maxDate: new Date(2021, 1, 1),
  },
  argTypes: {
    value: {
      control: false,
    },
    minDate: {
      control: "date",
    },
    maxDate: {
      control: "date",
    },
  },
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, setValue] = useState<Date | null>(new Date(2021, 0, 1));
    return <DatePicker {...args} onChange={(v) => setValue(v)} value={value} />;
  },
};

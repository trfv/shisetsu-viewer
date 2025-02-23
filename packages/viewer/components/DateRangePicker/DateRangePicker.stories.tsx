import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { DateRangePicker } from "./DateRangePicker";

export default {
  component: DateRangePicker,
} as Meta<typeof DateRangePicker>;

export const Default: StoryObj<typeof DateRangePicker> = {
  args: {
    label: "label",
    startDateProps: {
      value: null,
      onChange: () => null,
      minDate: new Date(2021, 0, 1),
      maxDate: new Date(2022, 11, 31),
    },
    endDateProps: {
      value: null,
      onChange: () => null,
      minDate: new Date(2021, 0, 1),
      maxDate: new Date(2022, 11, 31),
    },
  },
  argTypes: {
    startDateProps: {
      control: false,
    },
    endDateProps: {
      control: false,
    },
  },
  render: (args) => {
    const [startDate, setStartDate] = useState<Date | null>(new Date(2021, 0, 1));
    const [endDate, setEndDate] = useState<Date | null>(new Date(2021, 1, 1));
    const onChangeStartDate = (date: Date | null) => setStartDate(date);
    const onChangeEndDate = (date: Date | null) => setEndDate(date);
    return (
      <DateRangePicker
        {...args}
        endDateProps={{ ...args.endDateProps, value: endDate, onChange: onChangeEndDate }}
        startDateProps={{ ...args.startDateProps, value: startDate, onChange: onChangeStartDate }}
      />
    );
  },
};

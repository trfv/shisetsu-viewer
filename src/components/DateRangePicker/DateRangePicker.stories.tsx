import { useArgs } from "@storybook/client-api";
import type { ComponentMeta, ComponentStory } from "@storybook/react";
import { DateRangePicker } from "./DateRangePicker";

export default {
  title: "DateRangePicker",
  component: DateRangePicker,
  args: {
    label: "label",
    startDateProps: {
      value: new Date(2021, 0, 1),
      onChange: () => null,
      minDate: new Date(2021, 0, 1),
      maxDate: new Date(2022, 11, 31),
    },
    endDateProps: {
      value: new Date(2021, 1, 1),
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
} as ComponentMeta<typeof DateRangePicker>;

export const Basic: ComponentStory<typeof DateRangePicker> = (args) => {
  const [, updateArgs] = useArgs();
  const onChangeStartDate = (date: Date | null) =>
    updateArgs({ ...args, startDateProps: { ...args.startDateProps, value: date } });
  const onChangeEndDate = (date: Date | null) =>
    updateArgs({ ...args, endDateProps: { ...args.endDateProps, value: date } });
  return (
    <DateRangePicker
      {...args}
      startDateProps={{ ...args.startDateProps, onChange: onChangeStartDate }}
      endDateProps={{ ...args.endDateProps, onChange: onChangeEndDate }}
    />
  );
};

import { useArgs } from "@storybook/api";
import type { ComponentMeta, ComponentStory } from "@storybook/react";
import { DatePicker } from "./DatePicker";

export default {
  title: "DatePicker",
  component: DatePicker,
  args: {
    value: new Date(2021, 0, 1),
    minDate: new Date(2020, 11, 1),
    maxDate: new Date(2021, 1, 1),
  },
  argTypes: {
    value: {
      control: "date",
    },
    minDate: {
      control: "date",
    },
    maxDate: {
      control: "date",
    },
  },
} as ComponentMeta<typeof DatePicker>;

export const Basic: ComponentStory<typeof DatePicker> = (args) => {
  const [, updateArgs] = useArgs();
  const onChange = (date: Date | null) => updateArgs({ ...args, value: date });
  return <DatePicker {...args} onChange={onChange} />;
};

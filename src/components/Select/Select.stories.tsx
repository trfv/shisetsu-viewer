import { useArgs } from "@storybook/api";
import type { ComponentMeta, ComponentStory } from "@storybook/react";
import { Select, SelectChangeEvent } from "./Select";

export default {
  title: "Select",
  component: Select,
  args: {
    label: "label",
    value: "a",
    selectOptions: [
      { value: "a", label: "A" },
      { value: "b", label: "B" },
      { value: "c", label: "C" },
    ],
  },
  argTypes: {
    value: {
      control: {
        type: "select",
        options: ["a", "b", "c"],
      },
    },
    selectOptions: {
      control: false,
    },
    size: {
      control: false,
    },
  },
} as ComponentMeta<typeof Select>;

export const Basic: ComponentStory<typeof Select> = (args) => {
  const [, updateArgs] = useArgs();
  const onChange = (event: SelectChangeEvent<string>) =>
    updateArgs({ ...args, value: event.target.value });
  return <Select {...args} onChange={onChange} />;
};

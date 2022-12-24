import { useArgs } from "@storybook/preview-api";
import type { Meta, StoryObj } from "@storybook/react";
import { Select, SelectChangeEvent } from "./Select";

export default {
  component: Select,
} as Meta<typeof Select>;

export const Basic: StoryObj<typeof Select> = {
  args: {
    label: "label",
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
  render: (args) => {
    const [{ value }, updateArgs] = useArgs();
    const onChange = (event: SelectChangeEvent<string>) =>
      updateArgs({ ...args, value: event.target.value });
    return <Select {...args} value={value ?? args.value} onChange={onChange} />;
  },
};

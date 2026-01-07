import { useArgs } from "storybook/preview-api";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ChangeEvent } from "react";
import { Checkbox } from "./Checkbox";

export default {
  component: Checkbox,
} as Meta<typeof Checkbox>;

export const Default: StoryObj<typeof Checkbox> = {
  args: {
    label: "label",
    value: "value",
    checked: false,
  },
  argTypes: {
    value: {
      contorl: false,
    },
    size: {
      control: false,
    },
    noLeftMargin: {
      control: false,
    },
  },
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [, updateArgs] = useArgs();
    const onChange = (event: ChangeEvent<HTMLInputElement>) =>
      updateArgs({ ...args, checked: event.target.checked });
    return <Checkbox {...args} onChange={onChange} />;
  },
};

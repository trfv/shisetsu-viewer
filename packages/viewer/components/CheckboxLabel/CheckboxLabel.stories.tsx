import { useArgs } from "storybook/preview-api";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ChangeEvent } from "react";
import { Checkbox } from "../Checkbox/Checkbox";
import { CheckboxLabel } from "./CheckboxLabel";

export default {
  component: CheckboxLabel,
  subcomponents: { Checkbox },
} as Meta<typeof CheckboxLabel>;

export const Default: StoryObj<typeof CheckboxLabel> = {
  args: {
    label: "label",
    checkbox: {
      label: "label",
      value: "value",
      checked: false,
    },
  },
  argTypes: {
    size: {
      control: false,
    },
    checkbox: {
      control: false,
    },
  },
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [, updateArgs] = useArgs();
    const onChange = (event: ChangeEvent<HTMLInputElement>) =>
      updateArgs({ ...args, checkbox: { ...args.checkbox, checked: event.target.checked } });
    return (
      <CheckboxLabel
        {...args}
        checkbox={{ ...args.checkbox, label: "label", value: "value", onChange }}
      />
    );
  },
};

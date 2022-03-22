import type { ComponentMeta, ComponentStory } from "@storybook/react";
import type { ChangeEvent } from "react";
import { useState } from "react";
import { CheckboxLabel } from "./CheckboxLabel";

export default {
  title: "CheckboxLabel",
  component: CheckboxLabel,
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
} as ComponentMeta<typeof CheckboxLabel>;

export const Basic: ComponentStory<typeof CheckboxLabel> = (args) => {
  const [checked, setChecked] = useState(false);
  const onChange = (event: ChangeEvent<HTMLInputElement>) => setChecked(event.target.checked);
  return (
    <CheckboxLabel {...args} checkbox={{ label: "label", value: "value", checked, onChange }} />
  );
};

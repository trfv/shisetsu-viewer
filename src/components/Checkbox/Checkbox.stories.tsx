import { useArgs } from "@storybook/client-api";
import type { ComponentMeta, ComponentStory } from "@storybook/react";
import type { ChangeEvent } from "react";
import { Checkbox } from "./Checkbox";

export default {
  title: "Checkbox",
  component: Checkbox,
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
} as ComponentMeta<typeof Checkbox>;

export const Basic: ComponentStory<typeof Checkbox> = (args) => {
  const [, updateArgs] = useArgs();
  const onChange = (event: ChangeEvent<HTMLInputElement>) =>
    updateArgs({ ...args, checked: event.target.checked });
  return <Checkbox {...args} onChange={onChange} />;
};

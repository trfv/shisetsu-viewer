import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Input } from "./Input";

export default {
  component: Input,
} as Meta<typeof Input>;

export const Default: StoryObj<typeof Input> = {
  args: {
    label: "label",
    loading: false,
  },
  argTypes: {
    size: {
      control: false,
    },
  },
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, setValue] = useState("");
    return <Input {...args} onChange={(e) => setValue(e.target.value)} value={value} />;
  },
};

export const Small: StoryObj<typeof Input> = {
  ...Default,
  args: {
    ...Default.args,
    size: "small",
  },
};

export const Medium: StoryObj<typeof Input> = {
  ...Default,
  args: {
    ...Default.args,
    size: "medium",
  },
};

export const Large: StoryObj<typeof Input> = {
  ...Default,
  args: {
    ...Default.args,
    size: "large",
  },
};

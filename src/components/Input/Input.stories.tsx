import type { ComponentMeta, ComponentStoryObj } from "@storybook/react";
import { Input } from "./Input";

export default {
  title: "Input",
  component: Input,
  args: {
    label: "label",
    loading: false,
  },
  argTypes: {
    ref: {
      control: false,
    },
    size: {
      control: false,
    },
  },
} as ComponentMeta<typeof Input>;

export const Small: ComponentStoryObj<typeof Input> = {
  args: {
    size: "small",
  },
};

export const Medium: ComponentStoryObj<typeof Input> = {
  args: {
    size: "medium",
  },
};

export const Large: ComponentStoryObj<typeof Input> = {
  args: {
    size: "large",
  },
};

import type { ComponentMeta, ComponentStoryObj } from "@storybook/react";
import { BaseButton as Button } from "./BaseButton";

export default {
  title: "Button",
  component: Button,
  args: {
    children: "Button",
    color: "inherit",
    variant: "outlined",
  },
  argTypes: {
    ref: {
      control: false,
    },
    size: {
      control: false,
    },
  },
} as ComponentMeta<typeof Button>;

export const Small: ComponentStoryObj<typeof Button> = {
  args: { size: "small" },
};

export const Medium: ComponentStoryObj<typeof Button> = {
  args: { size: "medium" },
};

export const Large: ComponentStoryObj<typeof Button> = {
  args: { size: "large" },
};

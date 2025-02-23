import type { Meta, StoryObj } from "@storybook/react";
import { BaseButton as Button } from "./BaseButton";

export default {
  component: Button,
} as Meta<typeof Button>;

export const Default: StoryObj<typeof Button> = {
  args: {
    children: "Button",
    color: "inherit",
    variant: "outlined",
  },
  argTypes: {
    size: {
      control: false,
    },
  },
};

export const Small: StoryObj<typeof Button> = {
  ...Default,
  args: { ...Default.args, size: "small" },
};

export const Medium: StoryObj<typeof Button> = {
  ...Default,
  args: { ...Default.args, size: "medium" },
};

export const Large: StoryObj<typeof Button> = {
  ...Default,
  args: { ...Default.args, size: "large" },
};

import type { Meta, StoryObj } from "@storybook/react";
import { BaseLabel as Label } from "./BaseLabel";

export default {
  component: Label,
} as Meta<typeof Label>;

export const Default: StoryObj<typeof Label> = {
  args: {
    label: "default",
  },
  argTypes: {
    size: {
      control: false,
    },
    as: {
      control: false,
    },
  },
};

export const Small: StoryObj<typeof Label> = {
  ...Default,
  args: { ...Default.args, label: "small", size: "small" },
};

export const Medium: StoryObj<typeof Label> = {
  ...Default,
  args: { ...Default.args, label: "medium", size: "medium" },
};

export const Large: StoryObj<typeof Label> = {
  ...Default,
  args: { ...Default.args, label: "large", size: "large" },
};

import type { ComponentMeta, ComponentStoryObj } from "@storybook/react";
import { BaseLabel as Label } from "./BaseLabel";

export default {
  title: "Label",
  component: Label,
  argTypes: {
    size: {
      control: false,
    },
    as: {
      control: false,
    },
  },
} as ComponentMeta<typeof Label>;

export const Small: ComponentStoryObj<typeof Label> = {
  args: { label: "small", size: "small" },
};

export const Medium: ComponentStoryObj<typeof Label> = {
  args: { label: "medium", size: "medium" },
};

export const Large: ComponentStoryObj<typeof Label> = {
  args: { label: "large", size: "large" },
};

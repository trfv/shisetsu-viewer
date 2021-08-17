import type { Meta, Story } from "@storybook/react";
import type { ComponentProps } from "react";
import { Input } from "./Input";

export default {
  title: "Input",
  component: Input,
} as Meta;

export const Small: Story<ComponentProps<typeof Input>> = (args) => (
  <Input {...args} size="small" />
);
export const Medium: Story<ComponentProps<typeof Input>> = (args) => (
  <Input {...args} size="medium" />
);
export const Large: Story<ComponentProps<typeof Input>> = (args) => (
  <Input {...args} size="large" />
);

Small.args = {
  label: "small",
  value: "",
};
Medium.args = {
  label: "medium",
  value: "",
};
Large.args = {
  label: "large",
  value: "",
};

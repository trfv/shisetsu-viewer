import type { Meta, Story } from "@storybook/react";
import type { ComponentProps } from "react";
import { BaseButton as Button } from "./BaseButton";
import { LargeButton } from "./LargeButton";
import { MediumButton } from "./MediumButton";
import { SmallButton } from "./SmallButton";

export default {
  title: "Button",
  component: Button,
} as Meta;

export const Small: Story<ComponentProps<typeof SmallButton>> = (args) => <SmallButton {...args} />;
export const Medium: Story<ComponentProps<typeof MediumButton>> = (args) => (
  <MediumButton {...args} />
);
export const Large: Story<ComponentProps<typeof LargeButton>> = (args) => <LargeButton {...args} />;

Small.args = {
  children: "small",
  color: "inherit",
  variant: "outlined",
};
Medium.args = {
  children: "medium",
  color: "inherit",
  variant: "outlined",
};
Large.args = {
  children: "large",
  color: "inherit",
  variant: "outlined",
};

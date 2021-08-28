import type { Meta, Story } from "@storybook/react";
import type { ComponentProps } from "react";
import { BaseLabel as Label } from "./BaseLabel";
import { LargeLabel } from "./LargeLabel";
import { MediumLabel } from "./MediumLabel";
import { SmallLabel } from "./SmallLabel";

export default {
  title: "Label",
  component: Label,
} as Meta;

export const Small: Story = (args: ComponentProps<typeof SmallLabel>) => <SmallLabel {...args} />;
export const Medium: Story = (args: ComponentProps<typeof MediumLabel>) => (
  <MediumLabel {...args} />
);
export const Large: Story = (args: ComponentProps<typeof LargeLabel>) => <LargeLabel {...args} />;

Small.args = {
  label: "small",
};
Medium.args = {
  label: "medium",
};
Large.args = {
  label: "large",
};

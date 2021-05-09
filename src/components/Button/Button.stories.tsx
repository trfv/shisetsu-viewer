import React, { ComponentProps } from "react";
import { BaseButton as Button } from "./BaseButton";
import { LargeButton } from "./LargeButton";
import { MediumButton } from "./MediumButton";
import { SmallButton } from "./SmallButton";

export default {
  title: "Button",
  component: Button,
};

export const Small = (args: ComponentProps<typeof SmallButton>) => <SmallButton {...args} />;
export const Medium = (args: ComponentProps<typeof MediumButton>) => <MediumButton {...args} />;
export const Large = (args: ComponentProps<typeof LargeButton>) => <LargeButton {...args} />;

Small.args = {
  children: "small",
};
Medium.args = {
  children: "medium",
};
Large.args = {
  children: "large",
};

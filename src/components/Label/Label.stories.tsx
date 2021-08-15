import { ComponentProps } from "react";
import { BaseLabel as Label } from "./BaseLabel";
import { LargeLabel } from "./LargeLabel";
import { MediumLabel } from "./MediumLabel";
import { SmallLabel } from "./SmallLabel";

export default {
  title: "Label",
  component: Label,
};

export const Small = (args: ComponentProps<typeof SmallLabel>) => <SmallLabel {...args} />;
export const Medium = (args: ComponentProps<typeof MediumLabel>) => <MediumLabel {...args} />;
export const Large = (args: ComponentProps<typeof LargeLabel>) => <LargeLabel {...args} />;

Small.args = {
  label: "small",
  color: "inherit",
};
Medium.args = {
  label: "medium",
  color: "inherit",
};
Large.args = {
  label: "large",
  color: "inherit",
};

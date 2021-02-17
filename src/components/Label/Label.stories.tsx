import React, { ComponentProps } from "react";
import { BaseLabel as Label } from "./BaseLabel";
import { LargeLabel } from "./LargeLabel";
import { MiddleLabel } from "./MiddleLabel";
import { SmallLabel } from "./SmallLabel";

export default {
  title: "Label",
  component: Label,
};

export const Small = (args: ComponentProps<typeof SmallLabel>) => <SmallLabel {...args} />;
export const Middle = (args: ComponentProps<typeof MiddleLabel>) => <MiddleLabel {...args} />;
export const Large = (args: ComponentProps<typeof LargeLabel>) => <LargeLabel {...args} />;

Small.args = {
  label: "small",
};
Middle.args = {
  label: "middle",
};
Large.args = {
  label: "large",
};

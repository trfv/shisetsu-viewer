import React, { ComponentProps } from "react";
import { Input } from "./Input";

export default {
  title: "Input",
  component: Input,
};

export const Small = (args: ComponentProps<typeof Input>) => <Input {...args} size="small"  />
export const Medium = (args: ComponentProps<typeof Input>) => <Input {...args} size="medium"/>;
export const Large = (args: ComponentProps<typeof Input>) => <Input {...args} size="large" />;

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

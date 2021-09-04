import type { Meta, Story } from "@storybook/react";
import type { ChangeEvent, ComponentProps } from "react";
import { useState } from "react";
import { Checkbox } from "./Checkbox";

export default {
  title: "Checkbox",
  component: Checkbox,
} as Meta;

export const Basic: Story<ComponentProps<typeof Checkbox>> = ({ label }) => {
  const [checked, setChecked] = useState(false);
  const onChange = (event: ChangeEvent<HTMLInputElement>) => setChecked(event.target.checked);
  return <Checkbox label={label} value="value" checked={checked} onChange={onChange} />;
};

Basic.args = {
  label: "label",
};

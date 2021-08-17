import type { Meta, Story } from "@storybook/react";
import type { ChangeEvent, ComponentProps } from "react";
import { useState } from "react";
import { CheckboxLabel } from "./CheckboxLabel";

export default {
  title: "CheckboxLabel",
  component: CheckboxLabel,
} as Meta;

export const Basic: Story<ComponentProps<typeof CheckboxLabel>> = ({ label }) => {
  const [checked, setChecked] = useState(false);
  const onChange = (event: ChangeEvent<HTMLInputElement>) => setChecked(event.target.checked);
  return (
    <CheckboxLabel label={label} checkbox={{ label: "label", value: "value", checked, onChange }} />
  );
};

Basic.args = {
  label: "label",
};

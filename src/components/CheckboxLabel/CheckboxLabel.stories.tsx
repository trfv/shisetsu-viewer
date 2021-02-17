import React, { ChangeEvent, ComponentProps, useState } from "react";
import { CheckboxLabel } from "./CheckboxLabel";

type Props = ComponentProps<typeof CheckboxLabel>;

export default {
  title: "CheckboxLabel",
  component: CheckboxLabel,
};

export const Basic = ({ label }: Props) => {
  const [checked, setChecked] = useState(false);
  const onChange = (event: ChangeEvent<HTMLInputElement>) => setChecked(event.target.checked);
  return (
    <CheckboxLabel label={label} checkbox={{ label: "label", value: "value", checked, onChange }} />
  );
};

Basic.args = {
  label: "label",
};

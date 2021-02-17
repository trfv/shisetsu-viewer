import React, { ChangeEvent, ComponentProps, useState } from "react";
import { Checkbox } from "./Checkbox";

type Props = ComponentProps<typeof Checkbox>;

export default {
  title: "Checkbox",
  component: Checkbox,
};

export const Basic = ({ label }: Props) => {
  const [checked, setChecked] = useState(false);
  const onChange = (event: ChangeEvent<HTMLInputElement>) => setChecked(event.target.checked);
  return <Checkbox label={label} value="value" checked={checked} onChange={onChange} />;
};

Basic.args = {
  label: "label",
};

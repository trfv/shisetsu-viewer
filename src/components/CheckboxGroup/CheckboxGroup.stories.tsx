import { ChangeEvent, ComponentProps, useState } from "react";
import { Checkbox } from "../Checkbox";
import { CheckboxGroup } from "./CheckboxGroup";

type Props = ComponentProps<typeof CheckboxGroup>;

export default {
  title: "CheckboxGroup",
  component: CheckboxGroup,
};

export const Basic = ({ label }: Props) => {
  const [values, setValues] = useState<string[]>([]);
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValues((prev) =>
      event.target.checked
        ? [...prev, event.target.value]
        : prev.filter((v) => v !== event.target.value)
    );
  };
  return (
    <CheckboxGroup label={label} values={values} onChange={onChange}>
      <Checkbox label="A" value="a" />
      <Checkbox label="B" value="b" />
      <Checkbox label="C" value="c" />
      <Checkbox label="D" value="d" />
    </CheckboxGroup>
  );
};

Basic.args = {
  label: "label",
};

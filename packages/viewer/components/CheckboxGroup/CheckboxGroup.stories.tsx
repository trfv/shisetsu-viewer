import type { Meta, StoryObj } from "@storybook/react";
import type { ChangeEvent } from "react";
import { useState } from "react";
import { Checkbox } from "../Checkbox";
import { CheckboxGroup } from "./CheckboxGroup";

export default {
  component: CheckboxGroup,
} as Meta<typeof CheckboxGroup>;

export const Default: StoryObj<typeof CheckboxGroup> = {
  args: {
    label: "label",
  },
  argTypes: {
    size: {
      control: false,
    },
    values: {
      control: false,
    },
  },
  render: ({ label }) => {
    const [values, setValues] = useState<string[]>([]);
    const onChange = (event: ChangeEvent<HTMLInputElement>) => {
      setValues((prev) =>
        event.target.checked
          ? [...prev, event.target.value]
          : prev.filter((v) => v !== event.target.value)
      );
    };
    return (
      <CheckboxGroup label={label} onChange={onChange} values={values}>
        <Checkbox label="A" value="a" />
        <Checkbox label="B" value="b" />
        <Checkbox label="C" value="c" />
        <Checkbox label="D" value="d" />
      </CheckboxGroup>
    );
  },
};

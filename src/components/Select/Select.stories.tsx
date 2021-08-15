import { ComponentProps } from "react";
import { Select } from "./Select";

type Props = ComponentProps<typeof Select>;

export default {
  title: "Select",
  component: Select,
};

export const Basic = (args: Props) => (
  <Select
    {...args}
    selectOptions={[
      { value: "a", label: "A" },
      { value: "b", label: "B" },
      { value: "c", label: "C" },
    ]}
  />
);

Basic.args = {
  label: "label",
};

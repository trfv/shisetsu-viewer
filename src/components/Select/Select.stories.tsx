import type { Meta, Story } from "@storybook/react";
import type { ComponentProps } from "react";
import { Select } from "./Select";

export default {
  title: "Select",
  component: Select,
} as Meta;

export const Basic: Story<ComponentProps<typeof Select>> = (args) => (
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

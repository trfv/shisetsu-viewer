import React, { ComponentProps } from "react";
import CheckboxGroup from "../components/molecules/CheckboxGroup";

type Props = ComponentProps<typeof CheckboxGroup>;

export default {
  title: "atoms/CheckboxGroup",
  component: CheckboxGroup,
  argTypes: {
    label: {
      type: { name: "string", required: false },
    },
    checkboxItems: {
      defaultValue: [
        {
          label: "Label 1",
        },
        {
          label: "Label 2",
        },
      ],
    },
  },
};

export const Basic = (args: Props) => <CheckboxGroup {...args} />;

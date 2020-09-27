import React, { ComponentProps } from "react";
import Checkbox from "../components/atoms/Checkbox";

type Props = ComponentProps<typeof Checkbox>;

export default {
  title: "atoms/Checkbox",
  component: Checkbox,
  argTypes: {
    label: {
      type: { name: "string", required: false },
      defaultValue: "Label",
      control: {
        type: "text",
      },
    },
  },
};

export const Basic = (args: Props) => <Checkbox {...args} />;

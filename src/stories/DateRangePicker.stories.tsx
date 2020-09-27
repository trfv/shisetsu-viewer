import React, { ComponentProps } from "react";
import DateRangePicker from "../components/molecules/DateRangePicker";

type Props = ComponentProps<typeof DateRangePicker>;

export default {
  title: "atoms/DateRangePicker",
  component: DateRangePicker,
  argTypes: {
    label: {
      type: { name: "string", required: true },
      control: {
        type: "text",
      },
    },
    startDateProps: {
      type: { name: "object", required: true },
      control: {
        type: "object",
      },
    },
    endDateProps: {
      type: { name: "object", required: true },
      control: {
        type: "object",
      },
    },
  },
};

export const Basic = (args: Props) => <DateRangePicker {...args} />;
Basic.args = {
  label: "Label",
};

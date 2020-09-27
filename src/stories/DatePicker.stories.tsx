import React, { ComponentProps } from "react";
import DatePicker from "../components/atoms/DatePicker";

type Props = ComponentProps<typeof DatePicker>;

export default {
  title: "atoms/DatePicker",
  component: DatePicker,
  argTypes: {
    value: {
      type: { name: "string", required: true },
      control: {
        type: "date",
      },
    },
    minDate: {
      type: { name: "string", required: false },
      control: {
        type: "date",
      },
    },
    maxDate: {
      type: { name: "string", required: false },
      control: {
        type: "date",
      },
    },
  },
};

export const Basic = (args: Props) => <DatePicker {...args} />;
